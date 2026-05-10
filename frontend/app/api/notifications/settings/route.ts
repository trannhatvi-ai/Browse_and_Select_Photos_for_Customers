import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  getNotificationConfigForUser,
  normalizeNotificationConfig,
  upsertNotificationConfig,
} from '@/lib/notifications'
import { prisma } from '@/lib/db'

export async function GET() {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [config, logs] = await Promise.all([
    getNotificationConfigForUser(userId),
    prisma.notificationLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        channel: true,
        target: true,
        status: true,
        subject: true,
        error: true,
        createdAt: true,
      },
    }),
  ])

  return NextResponse.json({ config, logs })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const config = normalizeNotificationConfig(body.config || body)
  await upsertNotificationConfig(userId, config)

  return NextResponse.json({ config })
}
