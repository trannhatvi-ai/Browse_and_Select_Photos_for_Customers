import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { getPhoneLookupCandidates, isExpired, normalizePhone, verifyOtpCode } from '@/lib/auth-verification'

export async function POST(req: NextRequest) {
  try {
    const { token, password, phone, code } = await req.json()

    if ((!token && (!phone || !code)) || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (String(password).length < 6) {
      return NextResponse.json({ error: 'Mật khẩu phải có ít nhất 6 ký tự' }, { status: 400 })
    }

    if (phone && code) {
      const normalizedPhone = normalizePhone(phone)
      const user = await prisma.user.findFirst({
        where: {
          phone: { in: getPhoneLookupCandidates(normalizedPhone) },
          phoneVerifiedAt: { not: null },
        },
      })

      if (
        !user ||
        isExpired(user.passwordResetCodeExpires) ||
        !verifyOtpCode(code, user.passwordResetCodeHash)
      ) {
        return NextResponse.json({ error: 'Mã khôi phục không hợp lệ hoặc đã hết hạn' }, { status: 400 })
      }

      const hashedPassword = await bcrypt.hash(password, 10)

      await prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          passwordResetCodeHash: null,
          passwordResetCodeExpires: null,
          passwordResetToken: null,
          passwordResetExpires: null,
        },
      })

      return NextResponse.json({ success: true })
    }

    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpires: { gt: new Date() },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'Token không hợp lệ hoặc đã hết hạn' }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 })
  }
}
