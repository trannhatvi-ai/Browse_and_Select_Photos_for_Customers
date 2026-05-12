import { getServerSession } from 'next-auth'
import { GET, PATCH, POST } from '../../app/api/auth/complete-profile/route'
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
    settings: {
      upsert: jest.fn(),
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
  return new Request('http://localhost:3000/api/auth/complete-profile', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

describe('/api/auth/complete-profile', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getServerSession as jest.Mock).mockResolvedValue({
      user: { id: 'user-1', role: 'STUDIO' },
    })
  })

  it('returns current verified email and editable profile defaults', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'owner@example.com',
      emailVerifiedAt: new Date('2026-05-12T00:00:00.000Z'),
      username: 'owner',
      name: 'Owner',
      phone: null,
      phoneVerifiedAt: null,
      settings: { studioName: 'Owner Studio' },
    })

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({
      email: 'owner@example.com',
      emailVerified: true,
      username: 'owner',
      name: 'Owner',
      phone: null,
      phoneVerified: false,
      studioName: 'Owner Studio',
    })
  })

  it('updates profile fields, hashes password, stores normalized phone, and sends OTP', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'owner@example.com',
      emailVerifiedAt: new Date(),
      username: 'owner',
      phone: null,
      phoneVerifiedAt: null,
    })
    mockPrisma.user.findFirst.mockResolvedValue(null)
    mockPrisma.user.update.mockResolvedValue({})
    mockPrisma.settings.upsert.mockResolvedValue({})

    const response = await POST(jsonRequest({
      username: 'owner_studio',
      name: 'Owner Name',
      studioName: 'Owner Studio',
      password: 'secret123',
      phone: '090 123 4567',
    }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: expect.objectContaining({
        username: 'owner_studio',
        name: 'Owner Name',
        phone: '+84901234567',
        phoneVerifiedAt: null,
        password: expect.any(String),
      }),
    })
    expect(mockPrisma.settings.upsert).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      update: { studioName: 'Owner Studio', phone: '+84901234567', email: 'owner@example.com' },
      create: { userId: 'user-1', studioName: 'Owner Studio', phone: '+84901234567', email: 'owner@example.com' },
    })
    expect(sendPhoneVerificationSms).toHaveBeenCalledWith('+84901234567', '123456')
    expect(body).toEqual({ success: true, requiresPhoneVerification: true, devCode: '123456' })
  })

  it('keeps profile update successful when phone OTP delivery fails', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'owner@example.com',
      emailVerifiedAt: new Date(),
      username: 'owner',
      phone: null,
      phoneVerifiedAt: null,
    })
    mockPrisma.user.findFirst.mockResolvedValue(null)
    mockPrisma.user.update.mockResolvedValue({})
    mockPrisma.settings.upsert.mockResolvedValue({})
    ;(sendPhoneVerificationSms as jest.Mock).mockRejectedValueOnce(new Error('SMS provider unavailable'))
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    const response = await POST(jsonRequest({
      username: 'owner_studio',
      name: 'Owner Name',
      studioName: 'Owner Studio',
      password: 'secret123',
      phone: '090 123 4567',
    }))
    const body = await response.json()

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Complete profile phone verification delivery error:',
      expect.any(Error)
    )
    consoleErrorSpy.mockRestore()
    expect(response.status).toBe(200)
    expect(mockPrisma.user.update).toHaveBeenCalled()
    expect(mockPrisma.settings.upsert).toHaveBeenCalled()
    expect(body).toEqual({
      success: true,
      requiresPhoneVerification: true,
      deliveryErrors: ['phone'],
      devCode: '123456',
    })
  })

  it('verifies the pending phone code', async () => {
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
