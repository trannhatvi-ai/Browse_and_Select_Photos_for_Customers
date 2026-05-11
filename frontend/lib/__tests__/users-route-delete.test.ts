import { getServerSession } from 'next-auth'
import { DELETE } from '../../app/api/users/[id]/route'
import { prisma } from '@/lib/db'

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
    },
    $transaction: jest.fn(),
  },
}))

const mockPrisma = prisma as any

function params(id: string) {
  return { params: Promise.resolve({ id }) }
}

describe('DELETE /api/users/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getServerSession as jest.Mock).mockResolvedValue({
      user: { id: 'current-admin', role: 'ADMIN' },
    })
  })

  it('transfers owned projects and Cloudinary accounts before deleting a user', async () => {
    const tx = {
      project: {
        updateMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
      cloudinaryAccount: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'cloud-1', cloudName: 'studio-cloud' },
        ]),
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockResolvedValue({}),
        delete: jest.fn(),
      },
      photo: {
        updateMany: jest.fn(),
      },
      user: {
        delete: jest.fn().mockResolvedValue({}),
      },
    }
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'old-admin' })
    mockPrisma.$transaction.mockImplementation((callback: any) => callback(tx))

    const response = await DELETE({} as any, params('old-admin'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(tx.project.updateMany).toHaveBeenCalledWith({
      where: { createdBy: 'old-admin' },
      data: { createdBy: 'current-admin' },
    })
    expect(tx.cloudinaryAccount.update).toHaveBeenCalledWith({
      where: { id: 'cloud-1' },
      data: { userId: 'current-admin' },
    })
    expect(tx.user.delete).toHaveBeenCalledWith({ where: { id: 'old-admin' } })
    expect(body).toEqual({
      success: true,
      transferredProjects: 2,
      transferredCloudinaryAccounts: 1,
    })
  })

  it('does not let an admin delete their own account', async () => {
    const response = await DELETE({} as any, params('current-admin'))

    expect(response.status).toBe(400)
    expect(mockPrisma.$transaction).not.toHaveBeenCalled()
  })
})
