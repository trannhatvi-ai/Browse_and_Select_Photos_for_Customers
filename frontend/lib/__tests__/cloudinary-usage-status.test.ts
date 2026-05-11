import {
  getCloudinaryUsageStatusForSettings,
  getCloudinaryUsageStatusForUser,
} from '../cloudinary-usage-status'
import { prisma } from '@/lib/db'

jest.mock('@/lib/db', () => ({
  prisma: {
    settings: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    cloudinaryAccount: {
      count: jest.fn(),
    },
  },
}))

const mockPrisma = prisma as any

describe('cloudinary usage status', () => {
  let consoleErrorSpy: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    mockPrisma.cloudinaryAccount.count.mockResolvedValue(0)
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  it('does not crash dashboard layout when user settings lookup cannot reach database', async () => {
    mockPrisma.settings.findUnique.mockRejectedValue(new Error('Cannot reach database server'))

    await expect(getCloudinaryUsageStatusForUser('studio-1', 'STUDIO')).resolves.toEqual({
      cloudinaryUsageMode: 'not-configured',
      adminSharedCloudinaryAvailable: false,
      isUsingSharedCloudinary: false,
    })
  })

  it('does not crash when admin shared settings lookup cannot reach database', async () => {
    mockPrisma.settings.findFirst.mockRejectedValue(new Error('Cannot reach database server'))

    await expect(getCloudinaryUsageStatusForSettings(null, 'STUDIO')).resolves.toEqual({
      cloudinaryUsageMode: 'not-configured',
      adminSharedCloudinaryAvailable: false,
      isUsingSharedCloudinary: false,
    })
  })
})
