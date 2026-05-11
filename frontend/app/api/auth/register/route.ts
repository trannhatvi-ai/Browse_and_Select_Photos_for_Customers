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
import bcrypt from 'bcryptjs'

export async function POST(req: Request) {
  try {
    const { email, username, phone, name, password } = await req.json()
    const normalizedEmail = normalizeEmail(email)
    const normalizedPhone = normalizePhone(phone)
    const normalizedUsername = String(username || '').trim()
    const normalizedName = String(name || '').trim()

    if (!normalizedEmail || !normalizedUsername || !normalizedPhone || !normalizedName || !password) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (String(password).length < 6) {
      return Response.json({ error: 'Mật khẩu phải có ít nhất 6 ký tự' }, { status: 400 })
    }

    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ email: normalizedEmail }, { username: normalizedUsername }, { phone: normalizedPhone }],
      },
    })
    if (existing) {
      return Response.json({ error: 'Email, username hoặc số điện thoại đã tồn tại' }, { status: 400 })
    }

    const hashed = await bcrypt.hash(password, 12)
    const emailCode = generateOtpCode()
    const phoneCode = generateOtpCode()
    const verificationExpires = new Date(Date.now() + CONTACT_VERIFICATION_TTL_MS)

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        username: normalizedUsername,
        phone: normalizedPhone,
        name: normalizedName,
        password: hashed,
        role: 'STUDIO',
        authProvider: 'credentials',
        emailVerificationCodeHash: hashOtpCode(emailCode),
        emailVerificationExpires: verificationExpires,
        phoneVerificationCodeHash: hashOtpCode(phoneCode),
        phoneVerificationExpires: verificationExpires,
      },
    })

    const deliveryErrors: string[] = []
    await Promise.all([
      sendAccountVerificationEmail(normalizedEmail, emailCode).catch((error) => {
        console.error('Verification email error:', error)
        deliveryErrors.push('email')
      }),
      sendPhoneVerificationSms(normalizedPhone, phoneCode).catch((error) => {
        console.error('Verification SMS error:', error)
        deliveryErrors.push('phone')
      }),
    ])

    return Response.json({
      id: user.id,
      email: user.email,
      username: user.username,
      phone: user.phone,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
      requiresVerification: true,
      deliveryErrors,
      devCodes: {
        email: getDevCodePayload(emailCode),
        phone: getDevCodePayload(phoneCode),
      },
    }, { status: 201 })
  } catch (error) {
    console.error('Register error:', error)
    return Response.json({ error: 'Server error' }, { status: 500 })
  }
}
