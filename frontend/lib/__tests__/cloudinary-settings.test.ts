import {
  getCloudinaryCredentialsForUser,
  validateExistingProjectCloudinarySettings,
  validateUserCloudinarySettings,
} from '../cloudinary-settings'
import { prisma } from '@/lib/db'

jest.mock('@/lib/db', () => ({
  prisma: {
    settings: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    cloudinaryAccount: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    project: {
      findUnique: jest.fn(),
    },
  },
}))

const mockPrisma = prisma as any
const originalEnv = process.env

describe('cloudinary settings', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockPrisma.cloudinaryAccount.count.mockResolvedValue(0)
    mockPrisma.cloudinaryAccount.findMany.mockResolvedValue([])
    process.env = { ...originalEnv }
    delete process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
    delete process.env.CLOUDINARY_API_KEY
    delete process.env.CLOUDINARY_API_SECRET
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('uses admin saved Cloudinary credentials when the user has no private config', async () => {
    mockPrisma.settings.findUnique.mockResolvedValue({
      cloudinaryCloudName: '',
      cloudinaryApiKey: '',
      cloudinaryApiSecret: '',
    })
    mockPrisma.settings.findFirst.mockResolvedValue({
      userId: 'admin-1',
      cloudinaryCloudName: 'admin-cloud',
      cloudinaryApiKey: 'admin-key',
      cloudinaryApiSecret: 'admin-secret',
      allowSharedCloudinary: false,
    })

    await expect(getCloudinaryCredentialsForUser('studio-1')).resolves.toEqual({
      cloud_name: 'admin-cloud',
      api_key: 'admin-key',
      api_secret: 'admin-secret',
    })
  })

  it('allows new projects to use shared admin credentials when admin sharing is enabled', async () => {
    mockPrisma.settings.findUnique.mockResolvedValue({
      cloudinaryCloudName: '',
      cloudinaryApiKey: '',
      cloudinaryApiSecret: '',
      user: { role: 'STUDIO' },
    })
    mockPrisma.settings.findFirst.mockResolvedValue({
      userId: 'admin-1',
      cloudinaryCloudName: 'admin-cloud',
      cloudinaryApiKey: 'admin-key',
      cloudinaryApiSecret: 'admin-secret',
      allowSharedCloudinary: true,
    })

    await expect(validateUserCloudinarySettings('studio-1')).resolves.toEqual({
      isConfigured: true,
    })
  })

  it('blocks new projects without private credentials when admin sharing is disabled', async () => {
    mockPrisma.settings.findUnique.mockResolvedValue({
      cloudinaryCloudName: '',
      cloudinaryApiKey: '',
      cloudinaryApiSecret: '',
      user: { role: 'STUDIO' },
    })
    mockPrisma.settings.findFirst.mockResolvedValue({
      userId: 'admin-1',
      cloudinaryCloudName: 'admin-cloud',
      cloudinaryApiKey: 'admin-key',
      cloudinaryApiSecret: 'admin-secret',
      allowSharedCloudinary: false,
    })

    await expect(validateUserCloudinarySettings('studio-1')).resolves.toEqual({
      isConfigured: false,
      missing: ['Cloud Name', 'API Key', 'API Secret'],
    })
  })

  it('keeps existing projects working with admin credentials after sharing is disabled', async () => {
    mockPrisma.settings.findUnique.mockResolvedValue({
      cloudinaryCloudName: '',
      cloudinaryApiKey: '',
      cloudinaryApiSecret: '',
    })
    mockPrisma.settings.findFirst.mockResolvedValue({
      userId: 'admin-1',
      cloudinaryCloudName: 'admin-cloud',
      cloudinaryApiKey: 'admin-key',
      cloudinaryApiSecret: 'admin-secret',
      allowSharedCloudinary: false,
    })

    await expect(validateExistingProjectCloudinarySettings('studio-1')).resolves.toEqual({
      isConfigured: true,
    })
  })

  it('requires a complete admin Cloudinary credential set for shared new projects', async () => {
    mockPrisma.settings.findUnique.mockResolvedValue({
      cloudinaryCloudName: '',
      cloudinaryApiKey: '',
      cloudinaryApiSecret: '',
      user: { role: 'STUDIO' },
    })
    mockPrisma.settings.findFirst.mockResolvedValue({
      userId: 'admin-1',
      cloudinaryCloudName: 'admin-cloud',
      cloudinaryApiKey: 'admin-key',
      cloudinaryApiSecret: '',
      allowSharedCloudinary: true,
    })

    await expect(validateUserCloudinarySettings('studio-1')).resolves.toEqual({
      isConfigured: false,
    })
  })
})
