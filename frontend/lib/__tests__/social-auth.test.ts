import { buildAuthOptions } from '../auth'
import { prisma } from '@/lib/db'

jest.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    settings: {
      findFirst: jest.fn(),
    },
  },
}))

jest.mock('next-auth/providers/google', () => ({
  __esModule: true,
  default: jest.fn((config) => ({ id: 'google', type: 'oauth', ...config })),
}))

jest.mock('next-auth/providers/facebook', () => ({
  __esModule: true,
  default: jest.fn((config) => ({ id: 'facebook', type: 'oauth', ...config })),
}))

const mockPrisma = prisma as any

describe('social auth', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('registers both Google and Facebook providers when configured', () => {
    const options = buildAuthOptions(
      { enabled: true, clientId: 'google-client', clientSecret: 'google-secret' },
      { enabled: true, clientId: 'facebook-client', clientSecret: 'facebook-secret' }
    )

    expect(options.providers.map((provider: any) => provider.id)).toEqual([
      'credentials',
      'google',
      'facebook',
    ])
  })

  it('creates a Facebook user from a verified email profile', async () => {
    mockPrisma.user.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
    mockPrisma.user.create.mockResolvedValue({
      id: 'user-1',
      email: 'owner@example.com',
      name: 'Owner',
      username: 'owner',
      phone: null,
      phoneVerifiedAt: null,
      role: 'STUDIO',
      password: null,
      settings: null,
    })

    const options = buildAuthOptions()
    const result = await options.callbacks?.signIn?.({
      account: { provider: 'facebook', providerAccountId: 'fb-1' } as any,
      profile: { email: 'Owner@Example.com', name: 'Owner' } as any,
      user: {} as any,
    })

    expect(result).toBe(true)
    expect(mockPrisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: 'owner@example.com',
        name: 'Owner',
        username: 'owner',
        authProvider: 'facebook',
        facebookId: 'fb-1',
        emailVerifiedAt: expect.any(Date),
      }),
      include: { settings: true },
    })
  })

  it('links Facebook to an existing Google account with the same verified email', async () => {
    const existing = {
      id: 'user-1',
      email: 'owner@example.com',
      name: 'Owner',
      username: 'owner',
      phone: '+84901234567',
      phoneVerifiedAt: new Date('2026-05-12T00:00:00.000Z'),
      role: 'STUDIO',
      password: 'hash',
      googleId: 'google-1',
      facebookId: null,
      emailVerifiedAt: new Date('2026-05-12T00:00:00.000Z'),
      authProvider: 'google',
      settings: { studioName: 'Owner Studio' },
    }
    mockPrisma.user.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(existing)
    mockPrisma.user.update.mockResolvedValue({ ...existing, facebookId: 'fb-1' })

    const options = buildAuthOptions()
    await options.callbacks?.signIn?.({
      account: { provider: 'facebook', providerAccountId: 'fb-1' } as any,
      profile: { email: 'owner@example.com', name: 'Owner' } as any,
      user: {} as any,
    })

    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: expect.objectContaining({
        facebookId: 'fb-1',
        emailVerifiedAt: existing.emailVerifiedAt,
      }),
      include: { settings: true },
    })
  })
})
