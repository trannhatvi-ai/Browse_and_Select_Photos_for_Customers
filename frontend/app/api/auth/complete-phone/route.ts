import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { sendPhoneVerificationSms } from '@/lib/account-messages'
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

async function getSessionUserId() {
  const session = await getServerSession(authOptions)
  return (session?.user as { id?: string } | undefined)?.id || null
}

export async function POST(req: Request) {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { phone } = await req.json()
    const normalizedPhone = normalizePhone(phone)
    if (!normalizedPhone) {
      return NextResponse.json({ error: 'Số điện thoại không hợp lệ' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, phone: true, phoneVerifiedAt: true },
    })
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.phone === normalizedPhone && user.phoneVerifiedAt) {
      return NextResponse.json({ success: true })
    }

    const phoneCandidates = getPhoneLookupCandidates(normalizedPhone)
    const existing = await prisma.user.findFirst({
      where: {
        id: { not: userId },
        phone: { in: phoneCandidates },
      },
      select: { id: true },
    })
    if (existing) {
      const owner = await prisma.user.findUnique({
        where: { id: existing.id },
        select: { email: true },
      })
      return NextResponse.json(
        { error: owner?.email ? `Số điện thoại này đã được liên kết với email ${owner.email}` : 'Số điện thoại đã được dùng cho tài khoản khác' },
        { status: 409 }
      )
    }

    const code = generateOtpCode()
    await prisma.user.update({
      where: { id: userId },
      data: {
        phone: normalizedPhone,
        phoneVerifiedAt: null,
        phoneVerificationCodeHash: hashOtpCode(code),
        phoneVerificationExpires: new Date(Date.now() + CONTACT_VERIFICATION_TTL_MS),
      },
    })

    await sendPhoneVerificationSms(normalizedPhone, code)

    return NextResponse.json({
      success: true,
      devCode: getDevCodePayload(code),
    })
  } catch (error) {
    console.error('Complete phone start error:', error)
    return NextResponse.json({ error: 'Không thể gửi mã xác thực' }, { status: 500 })
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
        id: true,
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
    console.error('Complete phone verify error:', error)
    return NextResponse.json({ error: 'Không thể xác thực số điện thoại' }, { status: 500 })
  }
}
