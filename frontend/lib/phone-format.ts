export function normalizeVietnamPhone(phone?: string | null) {
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

export function formatVietnamPhoneForDisplay(phone?: string | null) {
  return normalizeVietnamPhone(phone) || (phone?.trim() || '')
}