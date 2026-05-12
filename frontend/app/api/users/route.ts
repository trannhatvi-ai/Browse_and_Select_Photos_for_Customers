import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getPhoneLookupCandidates, normalizeEmail, normalizePhone } from '@/lib/auth-verification'
import bcrypt from 'bcryptjs'

// GET /api/users — Lấy danh sách users (ADMIN only)
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      email: true,
      name: true,
      username: true,
      phone: true,
      role: true,
      createdAt: true,
      _count: {
        select: { projects: true }
      }
    }
  })

  return NextResponse.json(users)
}

// POST /api/users — Tạo user mới (ADMIN only)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { name, email, username, phone, password, role } = await req.json()
  const normalizedEmail = normalizeEmail(email)
  const normalizedPhone = normalizePhone(phone)
  const normalizedUsername = String(username || '').trim()
  const normalizedName = String(name || '').trim()

  if (!normalizedName || !normalizedEmail || !normalizedUsername || !normalizedPhone || !password) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        { email: normalizedEmail },
        { username: normalizedUsername },
        { phone: { in: getPhoneLookupCandidates(normalizedPhone) } },
      ],
    },
  })
  if (existing) {
    return NextResponse.json({ error: 'Email, username hoặc số điện thoại đã tồn tại' }, { status: 409 })
  }

  const hashedPassword = await bcrypt.hash(password, 10)

  const user = await prisma.user.create({
    data: {
      name: normalizedName,
      email: normalizedEmail,
      username: normalizedUsername,
      phone: normalizedPhone,
      password: hashedPassword,
      role: role || 'STUDIO'
    },
    select: { id: true, email: true, username: true, phone: true, name: true, role: true, createdAt: true }
  })

  return NextResponse.json(user)
}
