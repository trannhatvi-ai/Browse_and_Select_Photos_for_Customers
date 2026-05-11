import crypto from 'crypto'

export const CONTACT_VERIFICATION_TTL_MS = 1000 * 60 * 15
export const PASSWORD_RESET_CODE_TTL_MS = 1000 * 60 * 15

export function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() || ''
}

export function normalizePhone(phone?: string | null) {
  return phone?.trim().replace(/[\s().-]/g, '') || ''
}

export function generateOtpCode() {
  return crypto.randomInt(100000, 1000000).toString()
}

export function hashOtpCode(code: string) {
  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_VERIFICATION_SECRET || 'studio-pro-dev-secret'
  return crypto.createHmac('sha256', secret).update(code.trim()).digest('hex')
}

export function verifyOtpCode(code: string | undefined, hash: string | null | undefined) {
  if (!code || !hash) return false

  const candidate = hashOtpCode(code)
  const candidateBuffer = Buffer.from(candidate)
  const hashBuffer = Buffer.from(hash)

  if (candidateBuffer.length !== hashBuffer.length) return false
  return crypto.timingSafeEqual(candidateBuffer, hashBuffer)
}

export function isExpired(date?: Date | null) {
  return !date || date.getTime() < Date.now()
}

export function getDevCodePayload(code: string) {
  return process.env.NODE_ENV === 'production' ? undefined : code
}
