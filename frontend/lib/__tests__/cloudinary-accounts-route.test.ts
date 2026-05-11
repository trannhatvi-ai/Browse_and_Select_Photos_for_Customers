import { getServerSession } from 'next-auth'
import { DELETE, PATCH, POST } from '../../app/api/settings/cloudinary/accounts/route'
import { prisma } from '@/lib/db'

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

jest.mock('@/lib/auth', () => ({
  authOptions: {},
}))

jest.mock('@/lib/db', () => ({
  prisma: {
    cloudinaryAccount: {
      create: jest.fn(),
      updateMany: jest.fn(),
      findFirst: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}))

const mockPrisma = prisma as any
const missingTableError = Object.assign(new Error('table does not exist'), { code: 'P2021' })

function jsonRequest(body: Record<string, unknown>) {
  return new Request('http://localhost:3000/api/settings/cloudinary/accounts', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  }) as any
}

describe('/api/settings/cloudinary/accounts', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getServerSession as jest.Mock).mockResolvedValue({
      user: { id: 'user-1', role: 'ADMIN' },
    })
  })

  it('returns a migration-required response instead of 500 when creating before migration', async () => {
    mockPrisma.cloudinaryAccount.create.mockRejectedValue(missingTableError)

    const response = await POST(jsonRequest({
      cloudName: 'demo-cloud',
      apiKey: 'demo-key',
      apiSecret: 'demo-secret',
    }))
    const body = await response.json()

    expect(response.status).toBe(409)
    expect(body).toEqual({
      error: 'Cloudinary account pool has not been migrated yet.',
      migrationRequired: true,
    })
  })

  it('returns a migration-required response instead of 500 when updating before migration', async () => {
    mockPrisma.cloudinaryAccount.updateMany.mockRejectedValue(missingTableError)

    const response = await PATCH(jsonRequest({ id: 'cloud-1', enabled: false }))
    const body = await response.json()

    expect(response.status).toBe(409)
    expect(body.migrationRequired).toBe(true)
  })

  it('returns a migration-required response instead of 500 when deleting before migration', async () => {
    mockPrisma.cloudinaryAccount.deleteMany.mockRejectedValue(missingTableError)

    const response = await DELETE(jsonRequest({ id: 'cloud-1' }))
    const body = await response.json()

    expect(response.status).toBe(409)
    expect(body.migrationRequired).toBe(true)
  })
})
