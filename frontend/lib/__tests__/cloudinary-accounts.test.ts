import {
  getUploadCloudinaryAccountForUser,
  resolveCloudinaryAccountForPhoto,
  selectBestCloudinaryAccount,
} from '../cloudinary-accounts'
import { prisma } from '@/lib/db'

jest.mock('@/lib/db', () => ({
  prisma: {
    cloudinaryAccount: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    settings: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  },
}))

const mockPrisma = prisma as any

describe('cloudinary account pool', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockPrisma.cloudinaryAccount.findMany.mockReset()
    mockPrisma.cloudinaryAccount.findUnique.mockReset()
    mockPrisma.settings.findFirst.mockReset()
    mockPrisma.settings.findUnique.mockReset()
    mockPrisma.user.findUnique.mockReset()
    delete process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
    delete process.env.CLOUDINARY_API_KEY
    delete process.env.CLOUDINARY_API_SECRET
  })

  it('selects the enabled account with the most remaining storage', () => {
    const account = selectBestCloudinaryAccount([
      {
        id: 'cloud-1',
        userId: 'studio-1',
        label: 'Cloud 1',
        cloudName: 'cloud-one',
        apiKey: 'key-1',
        apiSecret: 'secret-1',
        enabled: true,
        usedBytes: BigInt(20),
        limitBytes: BigInt(100),
      },
      {
        id: 'cloud-2',
        userId: 'studio-1',
        label: 'Cloud 2',
        cloudName: 'cloud-two',
        apiKey: 'key-2',
        apiSecret: 'secret-2',
        enabled: true,
        usedBytes: BigInt(10),
        limitBytes: BigInt(200),
      },
    ])

    expect(account?.id).toBe('cloud-2')
    expect(account?.cloud_name).toBe('cloud-two')
  })

  it('normalizes previously persisted small limits as GB quotas', () => {
    const account = selectBestCloudinaryAccount([
      {
        id: 'cloud-1',
        userId: 'studio-1',
        label: 'Cloud 1',
        cloudName: 'cloud-one',
        apiKey: 'key-1',
        apiSecret: 'secret-1',
        enabled: true,
        usedBytes: BigInt(Math.round(169.53 * 1024 * 1024)),
        limitBytes: BigInt(25),
      },
    ])

    expect(account?.limitBytes).toBe(BigInt(25 * 1024 * 1024 * 1024))
  })

  it('uses a studio private pool instead of admin shared accounts for new uploads', async () => {
    mockPrisma.cloudinaryAccount.findMany
      .mockResolvedValueOnce([
        {
          id: 'studio-cloud',
          userId: 'studio-1',
          label: 'Studio Cloud',
          cloudName: 'studio-cloud',
          apiKey: 'studio-key',
          apiSecret: 'studio-secret',
          enabled: true,
          usedBytes: BigInt(0),
          limitBytes: BigInt(25),
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'admin-cloud',
          userId: 'admin-1',
          label: 'Admin Cloud',
          cloudName: 'admin-cloud',
          apiKey: 'admin-key',
          apiSecret: 'admin-secret',
          enabled: true,
          usedBytes: BigInt(0),
          limitBytes: BigInt(25),
        },
      ])

    const account = await getUploadCloudinaryAccountForUser('studio-1')

    expect(account?.id).toBe('studio-cloud')
    expect(mockPrisma.cloudinaryAccount.findMany).toHaveBeenCalledTimes(1)
  })

  it('keeps legacy admin-hosted photos resolvable after studio adds private accounts', async () => {
    mockPrisma.cloudinaryAccount.findUnique.mockResolvedValue(null)
    mockPrisma.cloudinaryAccount.findMany
      .mockResolvedValueOnce([
        {
          id: 'studio-cloud',
          userId: 'studio-1',
          label: 'Studio Cloud',
          cloudName: 'studio-cloud',
          apiKey: 'studio-key',
          apiSecret: 'studio-secret',
          enabled: true,
          usedBytes: BigInt(0),
          limitBytes: BigInt(25),
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'admin-cloud',
          userId: 'admin-1',
          label: 'Admin Cloud',
          cloudName: 'admin-cloud',
          apiKey: 'admin-key',
          apiSecret: 'admin-secret',
          enabled: true,
          usedBytes: BigInt(0),
          limitBytes: BigInt(25),
        },
      ])

    const account = await resolveCloudinaryAccountForPhoto('studio-1', {
      originalUrl: 'proofing/project/photo',
      previewUrl: 'https://res.cloudinary.com/admin-cloud/image/upload/v1/proofing/project/photo.jpg',
      cloudinaryAccountId: null,
      cloudinaryCloudName: null,
    })

    expect(account?.id).toBe('admin-cloud')
    expect(account?.cloud_name).toBe('admin-cloud')
  })

  it('falls back to legacy admin settings when the CloudinaryAccount table has not been migrated yet', async () => {
    const missingTableError = Object.assign(new Error('table does not exist'), { code: 'P2021' })
    mockPrisma.cloudinaryAccount.findMany.mockRejectedValue(missingTableError)
    mockPrisma.settings.findUnique.mockResolvedValue(null)
    mockPrisma.user.findUnique.mockResolvedValue({ role: 'STUDIO' })
    mockPrisma.settings.findFirst.mockResolvedValue({
      userId: 'admin-1',
      cloudinaryCloudName: 'admin-cloud',
      cloudinaryApiKey: 'admin-key',
      cloudinaryApiSecret: 'admin-secret',
      allowSharedCloudinary: true,
    })

    const account = await getUploadCloudinaryAccountForUser('studio-1')

    expect(account?.source).toBe('legacy-settings')
    expect(account?.cloud_name).toBe('admin-cloud')
  })
})
