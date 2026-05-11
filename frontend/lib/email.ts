import { Resend } from 'resend'
import { getAdminIntegrationConfig } from '@/lib/notifications'

export interface EmailJobData {
  to: string
  subject: string
  html: string
  from?: string
}

// Resend client - will be initialized with key from admin config or env
let resend: { apiKey: string; client: Resend } | null = null

async function getResendSettings() {
  const adminConfig = await getAdminIntegrationConfig()
  const adminApiKey = adminConfig.resend.enabled ? adminConfig.resend.apiKey.trim() : ''
  const apiKey = adminApiKey || process.env.RESEND_API_KEY || ''
  const from = adminConfig.resend.enabled && adminConfig.resend.fromEmail.trim()
    ? adminConfig.resend.fromEmail.trim()
    : process.env.EMAIL_FROM || 'Studio Pro <studiopro1008@gmail.com>'

  if (!apiKey) {
    throw new Error('No Resend API key configured in admin settings or .env')
  }

  return { apiKey, from }
}

async function getResendClient(apiKey: string) {
  if (!resend || resend.apiKey !== apiKey) {
    resend = { apiKey, client: new Resend(apiKey) }
  }
  return resend.client
}

// Email templates
export const templates = {
  projectInvitation: (project: any, link: string) => ({
    to: project.clientEmail,
    subject: `Your photos are ready: ${project.eventName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Geist, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Your photos are ready!</h2>
          <p>Hi ${project.clientName},</p>
          <p>Your <strong>${project.eventName}</strong> photos are ready for your review and selection.</p>
          <p>
            <a href="${link}" style="background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
              View Your Gallery
            </a>
          </p>
          ${project.accessPassword ? `<p><strong>Password:</strong> ${project.accessPassword}</p>` : ''}
          <p>Deadline to select: ${new Date(project.deadline).toLocaleDateString()}</p>
          <p>Max selections: ${project.maxSelections}</p>
          <hr />
          <div style="background: #f5f5f5; padding: 15px; margin-top: 20px; border-radius: 4px; font-size: 12px; color: #666;">
            <p style="margin: 0;"><strong>Studio Pro</strong> — Photo Proofing System</p>
            <p style="margin: 5px 0 0 0;">Email: studiopro1008@gmail.com</p>
          </div>
        </body>
      </html>
    `,
  }),
  selectionSubmitted: (project: any, count: number) => ({
    to: project.clientEmail,
    subject: `Selection received: ${count} photos selected`,
    html: `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Geist, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Selection Confirmed</h2>
          <p>You've selected <strong>${count} photos</strong> from your <strong>${project.eventName}</strong> gallery.</p>
          <p>We'll process your selections and be in touch soon!</p>
          <p>Thank you for choosing our studio.</p>
          <hr />
          <div style="background: #f5f5f5; padding: 15px; margin-top: 20px; border-radius: 4px; font-size: 12px; color: #666;">
            <p style="margin: 0;"><strong>Studio Pro</strong> — Photo Proofing System</p>
            <p style="margin: 5px 0 0 0;">Email: studiopro1008@gmail.com</p>
          </div>
        </body>
      </html>
    `,
  }),
  scheduleReminder: (studioName: string, subject: string, message: string, scheduleTime: string) => ({
    subject,
    html: `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Geist, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
            <h2 style="margin: 0; font-size: 24px;">📌 Nhắc nhở Lịch</h2>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <p style="font-size: 16px; margin-bottom: 20px;">Xin chào,</p>
            <div style="background: white; padding: 20px; border-left: 4px solid #667eea; margin-bottom: 20px; border-radius: 4px;">
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">⏰ Thời gian:</p>
              <p style="margin: 0; font-size: 18px; font-weight: bold; color: #667eea;">${scheduleTime}</p>
            </div>
            <div style="background: white; padding: 20px; border-radius: 4px; margin-bottom: 20px;">
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">📋 Chi tiết:</p>
              <p style="margin: 0; font-size: 15px; line-height: 1.6;">${message}</p>
            </div>
            <p style="color: #999; font-size: 13px; margin-top: 30px;">Vui lòng kiểm tra lại lịch trình của bạn và chuẩn bị sẵn sàng.</p>
          </div>
          <div style="background: #f0f0f0; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 8px 8px;">
            <p style="margin: 0;"><strong>Studio Pro</strong> — Hệ thống Quản lý Lịch Chụp</p>
            <p style="margin: 5px 0 0 0; font-size: 11px;">Email: studiopro1008@gmail.com</p>
            <p style="margin: 5px 0 0 0; font-size: 11px;">© ${new Date().getFullYear()} ${studioName}</p>
          </div>
        </body>
      </html>
    `,
  }),
  notification: (studioName: string, subject: string, message: string) => ({
    subject,
    html: `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Geist, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
            <h2 style="margin: 0; font-size: 24px;">🔔 Thông Báo</h2>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <p style="font-size: 16px; margin-bottom: 20px;">Xin chào,</p>
            <div style="background: white; padding: 25px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <p style="margin: 0 0 15px 0; font-size: 18px; font-weight: bold; color: #333;">${subject}</p>
              <p style="margin: 0; font-size: 15px; line-height: 1.8; color: #555;">${message}</p>
            </div>
            <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
              <p style="margin: 0; font-size: 13px; color: #856404;">
                Nếu bạn có thắc mắc, vui lòng liên hệ với Studio để được hỗ trợ.
              </p>
            </div>
          </div>
          <div style="background: #f0f0f0; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 8px 8px;">
            <p style="margin: 0;"><strong>Studio Pro</strong> — Hệ thống Quản lý Chọn Ảnh</p>
            <p style="margin: 5px 0 0 0; font-size: 11px;">Email: studiopro1008@gmail.com</p>
            <p style="margin: 5px 0 0 0; font-size: 11px;">© ${new Date().getFullYear()} ${studioName}</p>
          </div>
        </body>
      </html>
    `,
  }),
}

// Send email directly through Resend
export async function queueEmail(data: EmailJobData) {
  await sendEmailDirect(data)
}

async function sendEmailDirect(data: EmailJobData) {
  const settings = await getResendSettings()
  const { to, subject, html, from = settings.from } = data
  const resendClient = await getResendClient(settings.apiKey)
  await resendClient.emails.send({
    from,
    to,
    subject,
    html,
  })
}
