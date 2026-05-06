import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
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

  if (!name || !email || !username || !phone || !password) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }, { phone }] },
  })
  if (existing) {
    return NextResponse.json({ error: 'Email, username hoặc số điện thoại đã tồn tại' }, { status: 409 })
  }

  const hashedPassword = await bcrypt.hash(password, 10)

  const user = await prisma.user.create({
    data: {
      name,
      email,
      username,
      phone,
      password: hashedPassword,
      role: role || 'STUDIO'
    },
    select: { id: true, email: true, username: true, phone: true, name: true, role: true, createdAt: true }
  })

  return NextResponse.json(user)
}
