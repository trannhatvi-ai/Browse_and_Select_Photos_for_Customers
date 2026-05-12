import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { isMissingCloudinaryAccountTableError } from '@/lib/cloudinary-accounts'
import { getPhoneLookupCandidates, normalizeEmail, normalizePhone } from '@/lib/auth-verification'
import bcrypt from 'bcryptjs'

// PATCH /api/users/[id] - Cap nhat user (ADMIN only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  const sessionUser = session?.user as any
  if (!sessionUser || sessionUser.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()
  const { name, email, username, phone, password, role } = body
  const normalizedEmail = email ? normalizeEmail(email) : ''
  const normalizedPhone = phone ? normalizePhone(phone) : ''
  const normalizedUsername = username ? String(username).trim() : ''

  const data: any = {}
  if (name) data.name = name
  if (email) data.email = normalizedEmail
  if (username) data.username = normalizedUsername
  if (phone) {
    if (!normalizedPhone) {
      return NextResponse.json({ error: 'Số điện thoại không hợp lệ' }, { status: 400 })
    }
    data.phone = normalizedPhone
    data.phoneVerifiedAt = null
  }
  if (role) data.role = role
  if (password) data.password = await bcrypt.hash(password, 10)

  if (email || username || phone) {
    const existing = await prisma.user.findFirst({
      where: {
        id: { not: id },
        OR: [
          email ? { email: normalizedEmail } : undefined,
          username ? { username: normalizedUsername } : undefined,
          phone ? { phone: { in: getPhoneLookupCandidates(normalizedPhone) } } : undefined,
        ].filter(Boolean) as any,
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Email, username hoặc số điện thoại đã tồn tại' },
        { status: 409 }
      )
    }
  }

  const user = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, email: true, username: true, phone: true, name: true, role: true },
  })

  return NextResponse.json(user)
}

async function transferCloudinaryAccounts(tx: any, fromUserId: string, toUserId: string) {
  if (!tx.cloudinaryAccount) return 0

  const accounts = await tx.cloudinaryAccount.findMany({
    where: { userId: fromUserId },
    select: { id: true, cloudName: true },
  }).catch((error: unknown) => {
    if (isMissingCloudinaryAccountTableError(error)) return []
    throw error
  })

  let transferred = 0
  for (const account of accounts) {
    const existing = await tx.cloudinaryAccount.findFirst({
      where: { userId: toUserId, cloudName: account.cloudName },
      select: { id: true },
    })

    if (existing) {
      await tx.photo.updateMany({
        where: { cloudinaryAccountId: account.id },
        data: { cloudinaryAccountId: existing.id },
      })
      await tx.cloudinaryAccount.delete({ where: { id: account.id } })
    } else {
      await tx.cloudinaryAccount.update({
        where: { id: account.id },
        data: { userId: toUserId },
      })
    }
    transferred += 1
  }

  return transferred
}

// DELETE /api/users/[id] - Xoa user (ADMIN only, khong tu xoa chinh minh).
// Projects and Cloudinary accounts are transferred to the current admin first
// so account deletion does not orphan existing shows or break photo cleanup.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  const sessionUser = session?.user as any
  if (!sessionUser || sessionUser.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  if (id === sessionUser.id) {
    return NextResponse.json({ error: 'Không thể xóa chính mình' }, { status: 400 })
  }

  const targetUser = await prisma.user.findUnique({
    where: { id },
    select: { id: true },
  })
  if (!targetUser) {
    return NextResponse.json({ error: 'Không tìm thấy tài khoản' }, { status: 404 })
  }

  const result = await prisma.$transaction(async (tx) => {
    const transferredProjects = await tx.project.updateMany({
      where: { createdBy: id },
      data: { createdBy: sessionUser.id },
    })
    const transferredCloudinaryAccounts = await transferCloudinaryAccounts(tx, id, sessionUser.id)

    await tx.user.delete({ where: { id } })

    return {
      transferredProjects: transferredProjects.count,
      transferredCloudinaryAccounts,
    }
  })

  return NextResponse.json({ success: true, ...result })
}
