export interface SmsPayload {
  to: string
  message: string
  purpose: string
}

export async function sendSms(payload: SmsPayload) {
  const webhookUrl = process.env.SMS_WEBHOOK_URL

  if (!webhookUrl) {
    console.log(`[SMS:${payload.purpose}] ${payload.to}: ${payload.message}`)
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SMS webhook is not configured')
    }
    return { sent: false, skipped: true }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (process.env.SMS_WEBHOOK_SECRET) {
    headers.Authorization = `Bearer ${process.env.SMS_WEBHOOK_SECRET}`
  }

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    throw new Error(`SMS webhook failed with status ${res.status}`)
  }

  return { sent: true, skipped: false }
}
