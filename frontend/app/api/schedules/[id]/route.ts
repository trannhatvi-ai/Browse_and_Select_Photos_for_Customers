import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

const VALID_STATUSES = ['PLANNED', 'CONFIRMED', 'SHOOTING', 'COMPLETED', 'CANCELLED']

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id
  const role = (session?.user as any)?.role
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const existing = await prisma.shootSchedule.findUnique({
    where: { id },
    select: { userId: true },
  })
  if (!existing) return NextResponse.json({ error: 'Không tìm thấy lịch show.' }, { status: 404 })
  if (role !== 'ADMIN' && existing.userId !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const data = await buildUpdateData(body, userId, role)
  if ('error' in data) {
    return NextResponse.json({ error: data.error }, { status: data.status })
  }

  const schedule = await prisma.shootSchedule.update({
    where: { id },
    data: data.data,
  })

  return NextResponse.json(schedule)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id
  const role = (session?.user as any)?.role
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const existing = await prisma.shootSchedule.findUnique({
    where: { id },
    select: { userId: true },
  })
  if (!existing) return NextResponse.json({ error: 'Không tìm thấy lịch show.' }, { status: 404 })
  if (role !== 'ADMIN' && existing.userId !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.shootSchedule.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}

async function buildUpdateData(body: any, userId: string, role?: string) {
  const data: any = {}

  if ('title' in body) {
    const title = String(body.title || '').trim()
    if (!title) return { error: 'Vui lòng nhập tên lịch show.', status: 400 }
    data.title = title
  }

  if ('projectId' in body) {
    const projectId = body.projectId ? String(body.projectId) : null
    if (projectId) {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { createdBy: true },
      })
      if (!project) return { error: 'Không tìm thấy show chụp liên kết.', status: 404 }
      if (role !== 'ADMIN' && project.createdBy !== userId) {
        return { error: 'Bạn không có quyền dùng show chụp này.', status: 403 }
      }
    }
    data.projectId = projectId
  }

  for (const key of ['clientName', 'clientEmail', 'location', 'notes']) {
    if (key in body) data[key] = body[key] ? String(body[key]).trim() : null
  }

  if ('startAt' in body) {
    const startAt = parseDate(body.startAt)
    if (!startAt) return { error: 'Thời gian bắt đầu không hợp lệ.', status: 400 }
    data.startAt = startAt
  }
  if ('endAt' in body) data.endAt = parseDate(body.endAt)
  if ('reminderAt' in body) {
    data.reminderAt = parseDate(body.reminderAt)
    data.reminderSentAt = null
  }
  if ('notificationChannels' in body) {
    data.notificationChannels = Array.isArray(body.notificationChannels) ? body.notificationChannels : []
  }
  if ('status' in body) {
    data.status = VALID_STATUSES.includes(body.status) ? body.status : 'PLANNED'
  }

  return { data }
}

function parseDate(value: unknown) {
  if (!value) return null
  const date = new Date(String(value))
  return Number.isNaN(date.getTime()) ? null : date
}
