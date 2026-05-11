import { queueEmail } from '@/lib/email'
import { sendSms } from '@/lib/sms'

export async function sendAccountVerificationEmail(email: string, code: string) {
  await queueEmail({
    to: email,
    subject: 'Mã xác thực email Studio Pro',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Xác thực email Studio Pro</h2>
        <p>Mã xác thực email của bạn là:</p>
        <p style="font-size: 28px; letter-spacing: 6px; font-weight: bold;">${code}</p>
        <p>Mã có hiệu lực trong 15 phút. Nếu bạn không tạo tài khoản, hãy bỏ qua email này.</p>
      </div>
    `,
  })
}

export async function sendPasswordResetEmail(email: string, resetUrl: string) {
  await queueEmail({
    to: email,
    subject: 'Khôi phục mật khẩu Studio Pro',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Yêu cầu khôi phục mật khẩu</h2>
        <p>Bạn có thể đặt lại mật khẩu bằng nút bên dưới:</p>
        <p><a href="${resetUrl}" style="display:inline-block;background:#111;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;">Đặt lại mật khẩu</a></p>
        <p>Liên kết có hiệu lực trong 30 phút. Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>
      </div>
    `,
  })
}

export function sendPhoneVerificationSms(phone: string, code: string) {
  return sendSms({
    to: phone,
    purpose: 'account-verification',
    message: `Ma xac thuc Studio Pro cua ban la ${code}. Ma co hieu luc trong 15 phut.`,
  })
}

export function sendPasswordResetSms(phone: string, code: string) {
  return sendSms({
    to: phone,
    purpose: 'password-reset',
    message: `Ma dat lai mat khau Studio Pro cua ban la ${code}. Ma co hieu luc trong 15 phut.`,
  })
}
