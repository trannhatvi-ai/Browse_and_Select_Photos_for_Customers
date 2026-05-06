import { GET, POST } from './route'
import { prisma } from '@/lib/db'

jest.mock('@/lib/db', () => ({
  prisma: {
    project: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    photo: {
      findMany: jest.fn(),
    },
    selection: {
      createMany: jest.fn(),
    },
  },
}))

describe('Client Gallery API (public)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/gallery/[token]', () => {
    it('returns project and photos for valid token', async () => {
      const mockProject = {
        id: 'proj-1',
        clientName: 'Sarah',
        eventName: 'Wedding',
        maxSelections: 50,
        status: 'CHOOSING',
        accessPassword: null,
        photos: [],
      }

      ;(prisma.project.findFirst as jest.Mock).mockResolvedValue(mockProject)

      const res = await GET('valid-token' as any)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.project.clientName).toBe('Sarah')
    })

    it('returns 404 for invalid token', async () => {
      ;(prisma.project.findFirst as jest.Mock).mockResolvedValue(null)
      const res = await GET('bad-token' as any)
      expect(res.status).toBe(404)
    })

    it('requires password if project has one', async () => {
      const mockProject = {
        ...jest.requireActual('@/lib/db').prisma.project,
        accessPassword: 'secret123',
        photos: [],
      }
      ;(prisma.project.findFirst as jest.Mock).mockResolvedValue(mockProject)

      const req = new Request('http://localhost:3000/api/gallery/token?password=wrong', {
        method: 'GET',
      })
      const res = await GET('token' as any, req)
      expect(res.status).toBe(401)
    })
  })

  describe('POST /api/gallery/[token]/select', () => {
    it('submits selections within limit', async () => {
      const mockProject = {
        id: 'proj-1',
        status: 'CHOOSING',
        maxSelections: 50,
        selectedCount: 0,
      }

      ;(prisma.project.findFirst as jest.Mock).mockResolvedValue(mockProject)
      ;(prisma.selection.createMany as jest.Mock).mockResolvedValue({ count: 2 })

      const request = new Request('http://localhost:3000/api/gallery/token/select', {
        method: 'POST',
        body: JSON.stringify({
          selections: [{ photoId: 'p1', comment: 'retouch eyes' }, { photoId: 'p2' }],
        }),
      })

      const res = await POST('token' as any, request)
      expect(res.status).toBe(200)
    })

    it('rejects if max selections exceeded', async () => {
      const mockProject = {
        id: 'proj-1',
        status: 'CHOOSING',
        maxSelections: 2,
        selectedCount: 2,
      }

      ;(prisma.project.findFirst as jest.Mock).mockResolvedValue(mockProject)

      const request = new Request('http://localhost:3000/api/gallery/token/select', {
        method: 'POST',
        body: JSON.stringify({ selections: [{ photoId: 'p1' }] }),
      })

      const res = await POST('token' as any, request)
      expect(res.status).toBe(400)
    })
  })
})
