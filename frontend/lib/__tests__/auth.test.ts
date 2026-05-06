import { hash, compare } from 'bcryptjs'

describe('bcrypt hashing', () => {
  it('should hash password', async () => {
    const password = 'secret123'
    const hashed = await hash(password, 12)
    expect(hashed).not.toBe(password)
    expect(hashed.length).toBeGreaterThan(20)
  })

  it('should verify correct password', async () => {
    const password = 'secret123'
    const hashed = await hash(password, 12)
    const isValid = await compare(password, hashed)
    expect(isValid).toBe(true)
  })

  it('should reject incorrect password', async () => {
    const hashed = await hash('secret123', 12)
    const isValid = await compare('wrongpass', hashed)
    expect(isValid).toBe(false)
  })
})
