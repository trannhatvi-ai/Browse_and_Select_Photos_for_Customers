import crypto from 'crypto'

export const CONTACT_VERIFICATION_TTL_MS = 1000 * 60 * 15
export const PASSWORD_RESET_CODE_TTL_MS = 1000 * 60 * 15

export function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() || ''
}

export function normalizePhone(phone?: string | null) {
  const compact = phone?.trim().replace(/[\s().-]/g, '') || ''
  if (!compact) return ''

  let local = ''
  if (compact.startsWith('+84')) {
    local = `0${compact.slice(3)}`
  } else if (compact.startsWith('84')) {
    local = `0${compact.slice(2)}`
  } else {
    local = compact
  }

  if (!/^0[35789]\d{8}$/.test(local)) return ''
  return `+84${local.slice(1)}`
}

export function getPhoneLookupCandidates(phone?: string | null) {
  const normalized = normalizePhone(phone)
  if (!normalized) return []

  const local = `0${normalized.slice(3)}`
  const withoutPlus = normalized.slice(1)
  return Array.from(new Set([normalized, local, withoutPlus]))
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
