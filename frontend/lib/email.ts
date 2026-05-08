import { Resend } from 'resend'

export interface EmailJobData {
  to: string
  subject: string
  html: string
  from?: string
}

// Resend client
export const resend = new Resend(process.env.RESEND_API_KEY)

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
          <p style="color: #666; font-size: 12px;">Studio Pro — Photo Proofing System</p>
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
  const { to, subject, html, from = process.env.EMAIL_FROM || 'noreply@studio.com' } = data
  await resend.emails.send({
    from,
    to,
    subject,
    html,
  })
}

