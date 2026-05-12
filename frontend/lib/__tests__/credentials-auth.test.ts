import { buildAuthOptions } from '../auth'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'

jest.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
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

describe('credentials auth', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('selects only fields required for credentials login', async () => {
    const password = 'secret123'
    mockPrisma.user.findFirst.mockResolvedValue({
      id: 'user-1',
      email: 'owner@example.com',
      name: 'Owner',
      username: 'owner',
      phone: '+84901234567',
      phoneVerifiedAt: new Date('2026-05-12T00:00:00.000Z'),
      password: await bcrypt.hash(password, 10),
      role: 'STUDIO',
    })

    const options = buildAuthOptions()
    const credentialsProvider = options.providers[0] as any
    const result = await credentialsProvider.options.authorize({
      identifier: 'owner@example.com',
      password,
    })

    expect(result?.id).toBe('user-1')
    expect(mockPrisma.user.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        phone: true,
        phoneVerifiedAt: true,
        password: true,
        role: true,
      },
    }))
  })
})
