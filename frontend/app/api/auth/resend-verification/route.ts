import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import {
  CONTACT_VERIFICATION_TTL_MS,
  generateOtpCode,
  getDevCodePayload,
  hashOtpCode,
  normalizeEmail,
  normalizePhone,
} from '@/lib/auth-verification'
import { sendAccountVerificationEmail, sendPhoneVerificationSms } from '@/lib/account-messages'

export async function POST(req: NextRequest) {
  try {
    const { email, phone } = await req.json()
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
      return NextResponse.json({ success: true })
    }

    const expires = new Date(Date.now() + CONTACT_VERIFICATION_TTL_MS)
    const emailCode = user.emailVerifiedAt ? null : generateOtpCode()
    const phoneCode = user.phoneVerifiedAt ? null : generateOtpCode()
    const data: Record<string, string | Date | null> = {}

    if (emailCode) {
      data.emailVerificationCodeHash = hashOtpCode(emailCode)
      data.emailVerificationExpires = expires
    }

    if (phoneCode) {
      data.phoneVerificationCodeHash = hashOtpCode(phoneCode)
      data.phoneVerificationExpires = expires
    }

    if (Object.keys(data).length > 0) {
      await prisma.user.update({
        where: { id: user.id },
        data,
      })
    }

    const deliveryErrors: string[] = []
    await Promise.all([
      emailCode
        ? sendAccountVerificationEmail(normalizedEmail, emailCode).catch((error) => {
            console.error('Resend verification email error:', error)
            deliveryErrors.push('email')
          })
        : Promise.resolve(),
      phoneCode
        ? sendPhoneVerificationSms(normalizedPhone, phoneCode).catch((error) => {
            console.error('Resend verification SMS error:', error)
            deliveryErrors.push('phone')
          })
        : Promise.resolve(),
    ])

    return NextResponse.json({
      success: true,
      deliveryErrors,
      devCodes: {
        email: emailCode ? getDevCodePayload(emailCode) : undefined,
        phone: phoneCode ? getDevCodePayload(phoneCode) : undefined,
      },
    })
  } catch (error) {
    console.error('Resend verification error:', error)
    return NextResponse.json({ error: 'Không thể gửi lại mã xác thực' }, { status: 500 })
  }
}
