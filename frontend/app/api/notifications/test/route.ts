import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  buildScheduleReminderHtml,
  NotificationChannel,
  sendStudioNotification,
} from '@/lib/notifications'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const channels = Array.isArray(body.channels)
    ? body.channels.filter((channel: string) => ['email', 'telegram', 'facebook'].includes(channel)) as NotificationChannel[]
    : undefined
  const message = body.message || 'Đây là thông báo thử từ Studio Pro. Nếu bạn nhận được tin này, kênh thông báo đã sẵn sàng.'

  const results = await sendStudioNotification(
    {
      userId,
      subject: 'Studio Pro - thông báo thử',
      message,
      html: buildScheduleReminderHtml(message),
    },
    channels
  )

  const sentCount = results.filter((result) => result.status === 'sent').length
  return NextResponse.json({ ok: sentCount > 0, sentCount, results }, { status: sentCount > 0 ? 200 : 400 })
}
