import {
  generateOtpCode,
  getPhoneLookupCandidates,
  hashOtpCode,
  normalizeEmail,
  normalizePhone,
  verifyOtpCode,
} from '../auth-verification'

describe('auth verification helpers', () => {
  it('normalizes email and phone identifiers', () => {
    expect(normalizeEmail('  Studio@Example.COM ')).toBe('studio@example.com')
    expect(normalizePhone(' 090 123-4567 ')).toBe('+84901234567')
    expect(normalizePhone('84901234567')).toBe('+84901234567')
    expect(normalizePhone('+84 90 123 4567')).toBe('+84901234567')
  })

  it('rejects non Vietnamese mobile phone identifiers', () => {
    expect(normalizePhone('12345')).toBe('')
    expect(normalizePhone('+12025550123')).toBe('')
  })

  it('returns legacy phone lookup candidates for duplicate detection', () => {
    expect(getPhoneLookupCandidates('090 123 4567')).toEqual([
      '+84901234567',
      '0901234567',
      '84901234567',
    ])
  })

  it('generates six digit OTP codes', () => {
    expect(generateOtpCode()).toMatch(/^\d{6}$/)
  })

  it('verifies hashed OTP codes with constant output format', () => {
    const code = '123456'
    const hash = hashOtpCode(code)

    expect(hash).toHaveLength(64)
    expect(verifyOtpCode(code, hash)).toBe(true)
    expect(verifyOtpCode('654321', hash)).toBe(false)
  })
})
