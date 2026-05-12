import { GET, POST } from '../../app/api/settings/route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'
import { getCloudinaryUsageStatusForSettings } from '@/lib/cloudinary-usage-status'

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
      findUnique: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
    },
  },
}))

jest.mock('@/lib/cloudinary-usage-status', () => ({
  getCloudinaryUsageStatusForSettings: jest.fn().mockResolvedValue({}),
}))

jest.mock('@/lib/notifications', () => ({
  normalizeAdminIntegrationConfig: jest.fn((value) => value),
}))

const mockPrisma = prisma as any

describe('/api/settings', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getServerSession as jest.Mock).mockResolvedValue({
      user: { id: 'user-1', role: 'STUDIO' },
    })
  })

  it('creates a missing settings row from the user profile and returns user contact info', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      email: 'owner@example.com',
      phone: '+84901234567',
      name: 'Owner Studio',
      username: 'owner',
    })
    mockPrisma.settings.findUnique.mockResolvedValue(null)
    mockPrisma.settings.create.mockResolvedValue({
      id: 'settings-1',
      userId: 'user-1',
      studioName: 'Owner Studio',
      email: 'owner@example.com',
      phone: '+84901234567',
    })

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mockPrisma.settings.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        studioName: 'Owner Studio',
        email: 'owner@example.com',
        phone: '+84901234567',
      },
    })
    expect(body.email).toBe('owner@example.com')
    expect(body.phone).toBe('+84901234567')
    expect(body.studioName).toBe('Owner Studio')
  })

  it('falls back to the user profile when settings email and phone are empty', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      email: 'owner@example.com',
      phone: '+84901234567',
      name: 'Owner Studio',
      username: 'owner',
      emailVerifiedAt: new Date('2026-05-12T00:00:00.000Z'),
      phoneVerifiedAt: new Date('2026-05-12T00:00:00.000Z'),
    })
    mockPrisma.settings.findUnique.mockResolvedValue({
      id: 'settings-1',
      userId: 'user-1',
      studioName: 'My Studio',
      email: '',
      phone: null,
    })

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mockPrisma.settings.create).not.toHaveBeenCalled()
    expect(body.email).toBe('owner@example.com')
    expect(body.phone).toBe('+84901234567')
    expect(body.studioName).toBe('My Studio')
    expect(body.profileName).toBe('Owner Studio')
    expect(body.profileUsername).toBe('owner')
    expect(body.emailVerified).toBe(true)
    expect(body.phoneVerified).toBe(true)
  })

  it('syncs profile fields back to the user row and resets verification on contact change', async () => {
    mockPrisma.user.findUnique
      .mockResolvedValueOnce({
        email: 'owner@example.com',
        phone: '+84901234567',
      })
      .mockResolvedValueOnce({
        email: 'owner@example.com',
        phone: '+84901234567',
      })
    mockPrisma.user.findFirst.mockResolvedValue(null)
    mockPrisma.user.update.mockResolvedValue({})
    mockPrisma.settings.upsert.mockResolvedValue({})

    const response = await POST(new Request('http://localhost:3000/api/settings', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Owner Two',
        username: 'owner-two',
        studioName: 'Owner Studio',
        email: 'owner2@example.com',
        phone: '0912345678',
      }),
    }))

    expect(response.status).toBe(200)
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: expect.objectContaining({
        name: 'Owner Two',
        username: 'owner-two',
        email: 'owner2@example.com',
        phone: '+84912345678',
        emailVerifiedAt: null,
        phoneVerifiedAt: null,
        emailVerificationCodeHash: null,
        emailVerificationExpires: null,
        phoneVerificationCodeHash: null,
        phoneVerificationExpires: null,
      }),
    })
    expect(mockPrisma.settings.upsert).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      update: expect.objectContaining({
        studioName: 'Owner Studio',
        phone: '+84912345678',
        email: 'owner2@example.com',
      }),
      create: expect.objectContaining({
        userId: 'user-1',
        studioName: 'Owner Studio',
        phone: '+84912345678',
        email: 'owner2@example.com',
      }),
    })
  })
})
