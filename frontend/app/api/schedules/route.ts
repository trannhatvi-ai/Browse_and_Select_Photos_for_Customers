import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

const VALID_STATUSES = ['PLANNED', 'CONFIRMED', 'SHOOTING', 'COMPLETED', 'CANCELLED']

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id
  const role = (session?.user as any)?.role
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  const where: any = role === 'ADMIN' ? {} : { userId }
  if (from || to) {
    where.startAt = {}
    if (from) where.startAt.gte = new Date(from)
    if (to) where.startAt.lte = new Date(to)
  }

  const schedules = await prisma.shootSchedule.findMany({
    where,
    orderBy: { startAt: 'asc' },
    include: {
      project: {
        select: {
          id: true,
          eventName: true,
          clientName: true,
          clientEmail: true,
          accessToken: true,
        },
      },
    },
  })

  return NextResponse.json(schedules)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id
  const role = (session?.user as any)?.role
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const parsed = await parseScheduleBody(body, userId, role)
  if ('error' in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status })
  }

  const schedule = await prisma.shootSchedule.create({
    data: {
      userId,
      ...parsed.data,
    },
  })

  return NextResponse.json(schedule, { status: 201 })
}

async function parseScheduleBody(body: any, userId: string, role?: string) {
  const title = String(body.title || '').trim()
  if (!title) return { error: 'Vui lòng nhập tên lịch show.', status: 400 }

  const startAt = parseDate(body.startAt)
  if (!startAt) return { error: 'Thời gian bắt đầu không hợp lệ.', status: 400 }

  const endAt = parseDate(body.endAt)
  const reminderAt = parseDate(body.reminderAt)
  const status = VALID_STATUSES.includes(body.status) ? body.status : 'PLANNED'
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

  return {
    data: {
      projectId,
      title,
      clientName: body.clientName ? String(body.clientName).trim() : null,
      clientEmail: body.clientEmail ? String(body.clientEmail).trim() : null,
      location: body.location ? String(body.location).trim() : null,
      notes: body.notes ? String(body.notes).trim() : null,
      startAt,
      endAt,
      reminderAt,
      notificationChannels: Array.isArray(body.notificationChannels) ? body.notificationChannels : [],
      status,
    },
  }
}

function parseDate(value: unknown) {
  if (!value) return null
  const date = new Date(String(value))
  return Number.isNaN(date.getTime()) ? null : date
}
