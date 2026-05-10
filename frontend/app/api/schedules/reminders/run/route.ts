import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import {
  buildScheduleReminderHtml,
  buildScheduleReminderMessage,
  NotificationChannel,
  sendStudioNotification,
} from '@/lib/notifications'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const cronToken = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  const cronAllowed = Boolean(process.env.CRON_SECRET && cronToken === process.env.CRON_SECRET)
  const userId = (session?.user as any)?.id
  const role = (session?.user as any)?.role

  if (!cronAllowed && !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const where: any = {
    reminderAt: { lte: now },
    reminderSentAt: null,
    status: { notIn: ['COMPLETED', 'CANCELLED'] },
  }

  if (!cronAllowed && role !== 'ADMIN') {
    where.userId = userId
  }

  const schedules = await prisma.shootSchedule.findMany({
    where,
    orderBy: { reminderAt: 'asc' },
    take: 50,
  })

  const processed = []
  for (const schedule of schedules) {
    const message = buildScheduleReminderMessage(schedule)
    const channels = Array.isArray(schedule.notificationChannels)
      ? schedule.notificationChannels.filter((channel) => ['email', 'telegram', 'facebook'].includes(String(channel))) as NotificationChannel[]
      : undefined

    const results = await sendStudioNotification(
      {
        userId: schedule.userId,
        scheduleId: schedule.id,
        subject: `Nhắc lịch show chụp: ${schedule.title}`,
        message,
        html: buildScheduleReminderHtml(message),
      },
      channels
    )

    const sent = results.some((result) => result.status === 'sent')
    if (sent) {
      await prisma.shootSchedule.update({
        where: { id: schedule.id },
        data: { reminderSentAt: now },
      })
    }

    processed.push({
      id: schedule.id,
      title: schedule.title,
      sent,
      results,
    })
  }

  return NextResponse.json({
    processedCount: processed.length,
    sentCount: processed.filter((item) => item.sent).length,
    processed,
  })
}
