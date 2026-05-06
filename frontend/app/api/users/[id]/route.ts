import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'

// PATCH /api/users/[id] — Cập nhật user (ADMIN only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()
  const { name, email, username, phone, password, role } = body

  const data: any = {}
  if (name) data.name = name
  if (email) data.email = email
  if (username) data.username = username
  if (phone) data.phone = phone
  if (role) data.role = role
  if (password) data.password = await bcrypt.hash(password, 10)

  if (email || username || phone) {
    const existing = await prisma.user.findFirst({
      where: {
        id: { not: id },
        OR: [
          email ? { email } : undefined,
          username ? { username } : undefined,
          phone ? { phone } : undefined,
        ].filter(Boolean) as any,
      },
    })

    if (existing) {
      return NextResponse.json({ error: 'Email, username hoặc số điện thoại đã tồn tại' }, { status: 409 })
    }
  }

  const user = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, email: true, username: true, phone: true, name: true, role: true }
  })

  return NextResponse.json(user)
}

// DELETE /api/users/[id] — Xóa user (ADMIN only, không tự xóa chính mình)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  if (id === session.user.id) {
    return NextResponse.json({ error: 'Không thể xóa chính mình' }, { status: 400 })
  }

  await prisma.user.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
