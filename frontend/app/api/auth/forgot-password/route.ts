import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/db'
import {
  PASSWORD_RESET_CODE_TTL_MS,
  generateOtpCode,
  getDevCodePayload,
  getPhoneLookupCandidates,
  hashOtpCode,
  normalizeEmail,
  normalizePhone,
} from '@/lib/auth-verification'
import { sendPasswordResetEmail, sendPasswordResetSms } from '@/lib/account-messages'

export async function POST(req: NextRequest) {
  try {
    const { method, identifier } = await req.json()

    if (!method || !identifier) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const normalizedIdentifier = method === 'phone'
      ? normalizePhone(identifier)
      : normalizeEmail(identifier)
    const where = method === 'phone'
      ? { phone: { in: getPhoneLookupCandidates(normalizedIdentifier) } }
      : { email: normalizedIdentifier }

    const user = await prisma.user.findFirst({ where })

    // Avoid leaking whether the account exists
    if (!user) {
      return NextResponse.json({ success: true, mode: method === 'phone' ? 'phone-code' : 'email-link' })
    }

    if (method === 'phone') {
      if (!user.phone || !user.phoneVerifiedAt) {
        return NextResponse.json({ success: true, mode: 'phone-code' })
      }

      const code = generateOtpCode()
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetCodeHash: hashOtpCode(code),
          passwordResetCodeExpires: new Date(Date.now() + PASSWORD_RESET_CODE_TTL_MS),
        },
      })

      await sendPasswordResetSms(user.phone, code)

      return NextResponse.json({
        success: true,
        mode: 'phone-code',
        devCode: getDevCodePayload(code),
      })
    }

    if (!user.email) {
      return NextResponse.json({ success: true, mode: 'email-link' })
    }

    const token = crypto.randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 1000 * 60 * 30)

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: token,
        passwordResetExpires: expires,
      },
    })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const resetUrl = `${appUrl}/reset-password?token=${token}`

    await sendPasswordResetEmail(user.email, resetUrl)

    return NextResponse.json({
      success: true,
      mode: 'email-link',
      resetUrl: process.env.NODE_ENV === 'production' ? undefined : resetUrl,
    })
  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 })
  }
}
