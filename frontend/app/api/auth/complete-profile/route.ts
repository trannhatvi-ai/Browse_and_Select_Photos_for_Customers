import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { sendPhoneVerificationSms } from '@/lib/account-messages'
import { authOptions } from '@/lib/auth'
import {
  CONTACT_VERIFICATION_TTL_MS,
  generateOtpCode,
  getDevCodePayload,
  getPhoneLookupCandidates,
  hashOtpCode,
  isExpired,
  normalizePhone,
  verifyOtpCode,
} from '@/lib/auth-verification'
import { prisma } from '@/lib/db'

async function getSessionUserId() {
  const session = await getServerSession(authOptions)
  return (session?.user as { id?: string } | undefined)?.id || null
}

function emailPrefix(email: string) {
  return email.split('@')[0]?.toLowerCase().replace(/[^a-z0-9_]/g, '_') || 'studio'
}

function trimString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

export async function GET() {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        emailVerifiedAt: true,
        username: true,
        name: true,
        phone: true,
        phoneVerifiedAt: true,
        settings: { select: { studioName: true } },
      },
    })
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const fallbackName = user.name || emailPrefix(user.email)
    return NextResponse.json({
      email: user.email,
      emailVerified: Boolean(user.emailVerifiedAt),
      username: user.username || emailPrefix(user.email),
      name: fallbackName,
      phone: user.phone,
      phoneVerified: Boolean(user.phoneVerifiedAt),
      studioName: user.settings?.studioName || `${fallbackName} Studio`,
    })
  } catch (error) {
    console.error('Complete profile load error:', error)
    return NextResponse.json({ error: 'Không thể tải hồ sơ' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const username = trimString(body.username)
    const name = trimString(body.name)
    const studioName = trimString(body.studioName)
    const password = trimString(body.password)
    const normalizedPhone = normalizePhone(body.phone)

    if (!username || !name || !studioName || !password || !normalizedPhone) {
      return NextResponse.json({ error: 'Vui lòng nhập đầy đủ thông tin' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Mật khẩu phải có ít nhất 6 ký tự' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        emailVerifiedAt: true,
        username: true,
        phone: true,
        phoneVerifiedAt: true,
      },
    })
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const usernameOwner = await prisma.user.findFirst({
      where: {
        id: { not: userId },
        username,
      },
      select: { id: true },
    })
    if (usernameOwner) {
      return NextResponse.json({ error: 'Username đã tồn tại' }, { status: 409 })
    }

    const phoneCandidates = getPhoneLookupCandidates(normalizedPhone)
    const phoneOwner = await prisma.user.findFirst({
      where: {
        id: { not: userId },
        phone: { in: phoneCandidates },
      },
      select: { id: true },
    })
    if (phoneOwner) {
      const owner = await prisma.user.findUnique({
        where: { id: phoneOwner.id },
        select: { email: true },
      })
      return NextResponse.json(
        { error: owner?.email ? `Số điện thoại này đã được liên kết với email ${owner.email}` : 'Số điện thoại đã được dùng cho tài khoản khác' },
        { status: 409 }
      )
    }

    const phoneAlreadyVerified = user.phone === normalizedPhone && Boolean(user.phoneVerifiedAt)
    const code = phoneAlreadyVerified ? null : generateOtpCode()

    await prisma.user.update({
      where: { id: userId },
      data: {
        username,
        name,
        password: await bcrypt.hash(password, 12),
        phone: normalizedPhone,
        phoneVerifiedAt: phoneAlreadyVerified ? user.phoneVerifiedAt : null,
        phoneVerificationCodeHash: code ? hashOtpCode(code) : null,
        phoneVerificationExpires: code ? new Date(Date.now() + CONTACT_VERIFICATION_TTL_MS) : null,
      },
    })

    await prisma.settings.upsert({
      where: { userId },
      update: { studioName, phone: normalizedPhone, email: user.email },
      create: { userId, studioName, phone: normalizedPhone, email: user.email },
    })

    const deliveryErrors: string[] = []
    if (code) {
      try {
        await sendPhoneVerificationSms(normalizedPhone, code)
      } catch (error) {
        console.error('Complete profile phone verification delivery error:', error)
        deliveryErrors.push('phone')
      }
    }

    return NextResponse.json({
      success: true,
      requiresPhoneVerification: Boolean(code),
      deliveryErrors: deliveryErrors.length ? deliveryErrors : undefined,
      devCode: code ? getDevCodePayload(code) : undefined,
    })
  } catch (error) {
    console.error('Complete profile save error:', error)
    return NextResponse.json({ error: 'Không thể cập nhật hồ sơ' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { code } = await req.json()
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        phone: true,
        phoneVerificationCodeHash: true,
        phoneVerificationExpires: true,
      },
    })

    if (
      !user?.phone ||
      isExpired(user.phoneVerificationExpires) ||
      !verifyOtpCode(code, user.phoneVerificationCodeHash)
    ) {
      return NextResponse.json({ error: 'Mã xác thực không hợp lệ hoặc đã hết hạn' }, { status: 400 })
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        phoneVerifiedAt: new Date(),
        phoneVerificationCodeHash: null,
        phoneVerificationExpires: null,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Complete profile verify error:', error)
    return NextResponse.json({ error: 'Không thể xác thực số điện thoại' }, { status: 500 })
  }
}
