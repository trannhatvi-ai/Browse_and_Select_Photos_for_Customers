import { getServerSession } from 'next-auth'
import { PATCH, POST } from '../../app/api/auth/complete-phone/route'
import { prisma } from '@/lib/db'
import { sendPhoneVerificationSms } from '@/lib/account-messages'
import { hashOtpCode } from '../auth-verification'

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

jest.mock('@/lib/auth', () => ({
  authOptions: {},
}))

jest.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  },
}))

jest.mock('@/lib/account-messages', () => ({
  sendPhoneVerificationSms: jest.fn().mockResolvedValue({ sent: true }),
}))

jest.mock('../auth-verification', () => {
  const actual = jest.requireActual('../auth-verification')
  return {
    ...actual,
    generateOtpCode: jest.fn(() => '123456'),
  }
})

const mockPrisma = prisma as any

function jsonRequest(body: Record<string, unknown>) {
  return new Request('http://localhost:3000/api/auth/complete-phone', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

describe('/api/auth/complete-phone', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getServerSession as jest.Mock).mockResolvedValue({
      user: { id: 'user-1', role: 'STUDIO' },
    })
  })

  it('stores a normalized Vietnamese phone and sends a verification code', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      phone: null,
      phoneVerifiedAt: null,
    })
    mockPrisma.user.findFirst.mockResolvedValue(null)
    mockPrisma.user.update.mockResolvedValue({})

    const response = await POST(jsonRequest({ phone: '090 123 4567' }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
      where: {
        id: { not: 'user-1' },
        phone: { in: ['+84901234567', '0901234567', '84901234567'] },
      },
      select: { id: true },
    })
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: expect.objectContaining({
        phone: '+84901234567',
        phoneVerifiedAt: null,
      }),
    })
    expect(sendPhoneVerificationSms).toHaveBeenCalledWith('+84901234567', '123456')
    expect(body).toEqual({ success: true, devCode: '123456' })
  })

  it('rejects a phone already used by another account', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      phone: null,
      phoneVerifiedAt: null,
    })
    mockPrisma.user.findFirst.mockResolvedValue({ id: 'user-2' })

    const response = await POST(jsonRequest({ phone: '+84901234567' }))
    const body = await response.json()

    expect(response.status).toBe(409)
    expect(body).toEqual({ error: 'Số điện thoại đã được dùng cho tài khoản khác' })
    expect(mockPrisma.user.update).not.toHaveBeenCalled()
  })

  it('verifies the pending phone code for the signed in account', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      phone: '+84901234567',
      phoneVerificationCodeHash: hashOtpCode('123456'),
      phoneVerificationExpires: new Date(Date.now() + 60_000),
    })
    mockPrisma.user.update.mockResolvedValue({})

    const response = await PATCH(jsonRequest({ code: '123456' }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: {
        phoneVerifiedAt: expect.any(Date),
        phoneVerificationCodeHash: null,
        phoneVerificationExpires: null,
      },
    })
    expect(body).toEqual({ success: true })
  })
})
