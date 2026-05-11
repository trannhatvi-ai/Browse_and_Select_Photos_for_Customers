import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { queueEmail } from '@/lib/email'

export type NotificationChannel = 'email' | 'telegram' | 'facebook'

export interface NotificationConfig {
  email: {
    enabled: boolean
    address: string
  }
  telegram: {
    enabled: boolean
    chatId: string
  }
  facebook: {
    enabled: boolean
    pageAccessToken: string
    recipientId: string
  }
  reminderDefaults: {
    advanceMinutes: number
  }
}

export interface AdminIntegrationConfig {
  google: {
    enabled: boolean
    apiKey: string
    oauthClientId: string
    oauthClientSecret: string
  }
  telegram: {
    enabled: boolean
    botToken: string
    defaultChatId: string
  }
  resend: {
    enabled: boolean
    apiKey: string
    fromEmail: string
  }
}

export interface NotificationPayload {
  userId: string
  subject: string
  message: string
  html?: string
  scheduleId?: string
  toEmail?: string
}

export interface NotificationResult {
  channel: NotificationChannel
  target?: string
  status: 'sent' | 'skipped' | 'error'
  error?: string
}

export const DEFAULT_NOTIFICATION_CONFIG: NotificationConfig = {
  email: {
    enabled: true,
    address: '',
  },
  telegram: {
    enabled: false,
    chatId: '',
  },
  facebook: {
    enabled: false,
    pageAccessToken: '',
    recipientId: '',
  },
  reminderDefaults: {
    advanceMinutes: 1440,
  },
}

export const DEFAULT_ADMIN_INTEGRATION_CONFIG: AdminIntegrationConfig = {
  google: {
    enabled: false,
    apiKey: '',
    oauthClientId: '',
    oauthClientSecret: '',
  },
  telegram: {
    enabled: false,
    botToken: '',
    defaultChatId: '',
  },
  resend: {
    enabled: false,
    apiKey: '',
    fromEmail: '',
  },
}

export function normalizeNotificationConfig(value: unknown, fallbackEmail = ''): NotificationConfig {
  const raw = (value && typeof value === 'object' ? value : {}) as Partial<NotificationConfig>
  const advanceMinutes = Number(raw.reminderDefaults?.advanceMinutes)

  return {
    email: {
      enabled: raw.email?.enabled ?? true,
      address: raw.email?.address || fallbackEmail,
    },
    telegram: {
      enabled: raw.telegram?.enabled ?? false,
      chatId: raw.telegram?.chatId || '',
    },
    facebook: {
      enabled: raw.facebook?.enabled ?? false,
      pageAccessToken: raw.facebook?.pageAccessToken || '',
      recipientId: raw.facebook?.recipientId || '',
    },
    reminderDefaults: {
      advanceMinutes: Number.isFinite(advanceMinutes) && advanceMinutes > 0 ? advanceMinutes : 1440,
    },
  }
}

export function normalizeAdminIntegrationConfig(value: unknown): AdminIntegrationConfig {
  const raw = (value && typeof value === 'object' ? value : {}) as Partial<AdminIntegrationConfig>

  return {
    google: {
      enabled: raw.google?.enabled ?? false,
      apiKey: raw.google?.apiKey || '',
      oauthClientId: raw.google?.oauthClientId || '',
      oauthClientSecret: raw.google?.oauthClientSecret || '',
    },
    telegram: {
      enabled: raw.telegram?.enabled ?? false,
      botToken: raw.telegram?.botToken || '',
      defaultChatId: raw.telegram?.defaultChatId || '',
    },
    resend: {
      enabled: raw.resend?.enabled ?? false,
      apiKey: raw.resend?.apiKey || '',
      fromEmail: raw.resend?.fromEmail || '',
    },
  }
}

export function selectedChannelsFromConfig(config: NotificationConfig): NotificationChannel[] {
  return (['email', 'telegram', 'facebook'] as NotificationChannel[]).filter(
    (channel) => config[channel].enabled
  )
}

export async function getNotificationConfigForUser(userId: string) {
  const [settings, user] = await Promise.all([
    prisma.settings.findUnique({ where: { userId } }),
    prisma.user.findUnique({ where: { id: userId }, select: { email: true } }),
  ])

  return normalizeNotificationConfig(settings?.notificationConfig, settings?.email || user?.email || '')
}

export async function upsertNotificationConfig(userId: string, config: NotificationConfig) {
  const normalized = normalizeNotificationConfig(config)

  return prisma.settings.upsert({
    where: { userId },
    update: { notificationConfig: normalized as unknown as Prisma.InputJsonValue },
    create: {
      userId,
      studioName: 'STUDIO',
      notificationConfig: normalized as unknown as Prisma.InputJsonValue,
    },
  })
}

export async function getAdminIntegrationConfig() {
  const settings = await prisma.settings.findFirst({
    where: {
      user: {
        role: 'ADMIN',
      },
    },
    select: {
      adminIntegrationConfig: true,
    },
  })

  return normalizeAdminIntegrationConfig(settings?.adminIntegrationConfig)
}

export async function upsertAdminIntegrationConfig(userId: string, config: AdminIntegrationConfig) {
  const normalized = normalizeAdminIntegrationConfig(config)

  return prisma.settings.upsert({
    where: { userId },
    update: { adminIntegrationConfig: normalized as unknown as Prisma.InputJsonValue },
    create: {
      userId,
      studioName: 'STUDIO',
      adminIntegrationConfig: normalized as unknown as Prisma.InputJsonValue,
    },
  })
}

export function buildScheduleReminderMessage(schedule: {
  title: string
  clientName?: string | null
  location?: string | null
  startAt: Date
  endAt?: Date | null
}) {
  const start = new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(schedule.startAt)
  const end = schedule.endAt
    ? new Intl.DateTimeFormat('vi-VN', { timeStyle: 'short' }).format(schedule.endAt)
    : ''

  return [
    `Lịch show: ${schedule.title}`,
    schedule.clientName ? `Khách: ${schedule.clientName}` : '',
    `Thời gian: ${start}${end ? ` - ${end}` : ''}`,
    schedule.location ? `Địa điểm: ${schedule.location}` : '',
  ].filter(Boolean).join('\n')
}

export function buildScheduleReminderHtml(message: string) {
  return `
    <!DOCTYPE html>
    <html>
      <body style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #111;">
        <h2 style="margin-bottom: 12px;">Nhắc lịch show chụp</h2>
        <pre style="white-space: pre-wrap; font-family: Arial, sans-serif; line-height: 1.6; background: #f6f6f6; border-radius: 10px; padding: 16px;">${escapeHtml(message)}</pre>
        <p style="font-size: 12px; color: #666;">Studio Pro notification</p>
      </body>
    </html>
  `
}

async function resolveTelegramChatTarget(botToken: string, configuredChatId: string) {
  const value = configuredChatId.trim()
  if (!value.startsWith('@')) return value

  const username = value.slice(1).toLowerCase()
  const response = await fetch(`https://api.telegram.org/bot${botToken}/getUpdates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      limit: 100,
      allowed_updates: ['message'],
    }),
  })
  const data = await response.json().catch(() => null)
  if (!response.ok || !data?.ok) {
    throw new Error(`Không thể kiểm tra liên kết Telegram cho "${value}". Vui lòng thử lại sau.`)
  }

  const matchedUpdate = data.result?.find((update: any) => {
    const chatUsername = update.message?.chat?.username?.toLowerCase()
    const fromUsername = update.message?.from?.username?.toLowerCase()
    return chatUsername === username || fromUsername === username
  })
  const chatId = matchedUpdate?.message?.chat?.id
  if (!chatId) {
    throw new Error(`Chưa liên kết được Telegram "${value}". Hãy mở bot @studio_pro_bot, bấm Start hoặc gửi /start, rồi test lại.`)
  }

  return String(chatId)
}

export async function sendStudioNotification(
  payload: NotificationPayload,
  channels?: NotificationChannel[]
): Promise<NotificationResult[]> {
  const config = await getNotificationConfigForUser(payload.userId)
  const adminIntegrationConfig = await getAdminIntegrationConfig()
  const desiredChannels = channels?.length ? channels : selectedChannelsFromConfig(config)
  const results: NotificationResult[] = []

  for (const channel of desiredChannels) {
    const result = await sendToChannel(channel, config, adminIntegrationConfig, payload)
    results.push(result)
    await recordNotificationResult(payload, result)
  }

  return results
}

async function sendToChannel(
  channel: NotificationChannel,
  config: NotificationConfig,
  adminIntegrationConfig: AdminIntegrationConfig,
  payload: NotificationPayload
): Promise<NotificationResult> {
  let attemptedTarget: string | undefined
  try {
    if (channel === 'email') {
      if (!config.email.enabled) return skipped(channel, 'Email chưa được bật.')
      const to = payload.toEmail || config.email.address
      if (!to) throw new Error('Chưa có email nhận thông báo.')

      await queueEmail({
        to,
        subject: payload.subject,
        html: payload.html || buildScheduleReminderHtml(payload.message),
      })
      return { channel, target: to, status: 'sent' }
    }

    if (channel === 'telegram') {
      if (!config.telegram.enabled) return skipped(channel, 'Telegram chưa được bật.')
      if (!adminIntegrationConfig.telegram.enabled) {
        throw new Error('Admin chưa bật Telegram bot Studio Pro.')
      }
      if (!adminIntegrationConfig.telegram.botToken) {
        throw new Error('Admin chưa cấu hình Bot Token cho Telegram.')
      }

      const configuredChatId = config.telegram.chatId || adminIntegrationConfig.telegram.defaultChatId
      if (!configuredChatId) {
        throw new Error('Chưa cấu hình Chat ID hoặc Admin chưa cấu hình Chat ID mặc định cho Telegram.')
      }
      attemptedTarget = configuredChatId
      const chatId = await resolveTelegramChatTarget(adminIntegrationConfig.telegram.botToken, configuredChatId)

      const response = await fetch(`https://api.telegram.org/bot${adminIntegrationConfig.telegram.botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: `${payload.subject}\n\n${payload.message}`,
          disable_web_page_preview: true,
        }),
      })
      if (!response.ok) {
        const errorText = await response.text()
        const normalizedError = errorText.toLowerCase()
        if (normalizedError.includes("can't initiate conversation")) {
          throw new Error(`Telegram đã nhận "${configuredChatId}", nhưng bot chưa được phép nhắn cho tài khoản này. Hãy mở bot @studio_pro_bot, bấm Start hoặc gửi /start, rồi test lại.`)
        }
        if (normalizedError.includes('chat not found')) {
          throw new Error(`Telegram không tìm thấy "${configuredChatId}". Nếu đây là chat cá nhân, hãy mở bot @studio_pro_bot, gửi /start, rồi test lại.`)
        }
        throw new Error(errorText)
      }
      return { channel, target: configuredChatId, status: 'sent' }
    }

    if (!config.facebook.enabled) return skipped(channel, 'Facebook chưa được bật.')
    if (!config.facebook.pageAccessToken || !config.facebook.recipientId) {
      throw new Error('Thiếu Page Access Token hoặc Recipient ID Facebook.')
    }

    const response = await fetch(
      `https://graph.facebook.com/v19.0/me/messages?access_token=${encodeURIComponent(config.facebook.pageAccessToken)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: { id: config.facebook.recipientId },
          message: { text: `${payload.subject}\n\n${payload.message}` },
        }),
      }
    )
    if (!response.ok) throw new Error(await response.text())
    return { channel, target: config.facebook.recipientId, status: 'sent' }
  } catch (error) {
    return {
      channel,
      target: attemptedTarget,
      status: 'error',
      error: (error as Error).message || 'Không thể gửi thông báo.',
    }
  }
}

function skipped(channel: NotificationChannel, error: string): NotificationResult {
  return { channel, status: 'skipped', error }
}

async function recordNotificationResult(payload: NotificationPayload, result: NotificationResult) {
  try {
    await prisma.notificationLog.create({
      data: {
        userId: payload.userId,
        scheduleId: payload.scheduleId,
        channel: result.channel,
        target: result.target,
        status: result.status,
        subject: payload.subject,
        message: payload.message,
        error: result.error,
      },
    })
  } catch (error) {
    console.error('Failed to write notification log:', error)
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
