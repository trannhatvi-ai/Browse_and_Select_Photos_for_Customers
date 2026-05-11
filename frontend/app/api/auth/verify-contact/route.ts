import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { isExpired, normalizeEmail, normalizePhone, verifyOtpCode } from '@/lib/auth-verification'

export async function POST(req: NextRequest) {
  try {
    const { email, phone, emailCode, phoneCode } = await req.json()
    const normalizedEmail = normalizeEmail(email)
    const normalizedPhone = normalizePhone(phone)

    if (!normalizedEmail || !normalizedPhone) {
      return NextResponse.json({ error: 'Vui lòng nhập email và số điện thoại đã đăng ký' }, { status: 400 })
    }

    const user = await prisma.user.findFirst({
      where: {
        email: normalizedEmail,
        phone: normalizedPhone,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'Không tìm thấy tài khoản cần xác thực' }, { status: 404 })
    }

    const updates: Record<string, Date | null> = {}

    if (!user.emailVerifiedAt) {
      if (!emailCode) {
        return NextResponse.json({ error: 'Vui lòng nhập mã xác thực email' }, { status: 400 })
      }
      if (isExpired(user.emailVerificationExpires) || !verifyOtpCode(emailCode, user.emailVerificationCodeHash)) {
        return NextResponse.json({ error: 'Mã xác thực email không hợp lệ hoặc đã hết hạn' }, { status: 400 })
      }
      updates.emailVerifiedAt = new Date()
      updates.emailVerificationCodeHash = null
      updates.emailVerificationExpires = null
    }

    if (!user.phoneVerifiedAt) {
      if (!phoneCode) {
        return NextResponse.json({ error: 'Vui lòng nhập mã xác thực số điện thoại' }, { status: 400 })
      }
      if (isExpired(user.phoneVerificationExpires) || !verifyOtpCode(phoneCode, user.phoneVerificationCodeHash)) {
        return NextResponse.json({ error: 'Mã xác thực số điện thoại không hợp lệ hoặc đã hết hạn' }, { status: 400 })
      }
      updates.phoneVerifiedAt = new Date()
      updates.phoneVerificationCodeHash = null
      updates.phoneVerificationExpires = null
    }

    if (Object.keys(updates).length > 0) {
      await prisma.user.update({
        where: { id: user.id },
        data: updates,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Verify contact error:', error)
    return NextResponse.json({ error: 'Không thể xác thực tài khoản' }, { status: 500 })
  }
}
