import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/db'
import { queueEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const { method, identifier } = await req.json()

    if (!method || !identifier) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const normalizedIdentifier = String(identifier).trim()
    const where = method === 'phone'
      ? { phone: normalizedIdentifier }
      : { email: normalizedIdentifier }

    const user = await prisma.user.findFirst({ where })

    // Avoid leaking whether the account exists
    if (!user || !user.email) {
      return NextResponse.json({ success: true })
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

    await queueEmail({
      to: user.email,
      subject: 'Khôi phục mật khẩu Studio',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Yêu cầu khôi phục mật khẩu</h2>
          <p>Bạn có thể đặt lại mật khẩu bằng nút bên dưới:</p>
          <p><a href="${resetUrl}" style="display:inline-block;background:#111;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;">Đặt lại mật khẩu</a></p>
          <p>Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>
        </div>
      `,
    })

    return NextResponse.json({
      success: true,
      resetUrl: process.env.NODE_ENV === 'production' ? undefined : resetUrl,
    })
  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 })
  }
}