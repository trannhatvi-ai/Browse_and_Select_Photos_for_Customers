import { GET, PATCH, DELETE } from './route'
import { prisma } from '@/lib/db'

jest.mock('@/lib/db', () => ({
  prisma: {
    project: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}))

describe('Project Detail API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/projects/[id]', () => {
    it('returns project by ID', async () => {
      const mockProject = {
        id: 'proj-1',
        clientName: 'Sarah',
        eventName: 'Wedding',
        eventDate: new Date('2024-06-15'),
        deadline: new Date('2024-07-01'),
        maxSelections: 50,
        status: 'CHOOSING',
        photos: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      ;(prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject)

      const res = await GET('proj-1' as any)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.id).toBe('proj-1')
    })

    it('returns 404 if project not found', async () => {
      ;(prisma.project.findUnique as jest.Mock).mockResolvedValue(null)
      const res = await GET('nonexistent' as any)
      expect(res.status).toBe(404)
    })
  })

  describe('PATCH /api/projects/[id]', () => {
    it('updates project status', async () => {
      const updated = {
        id: 'proj-1',
        status: 'DONE',
        updatedAt: new Date(),
      }

      ;(prisma.project.update as jest.Mock).mockResolvedValue(updated)

      const request = new Request('http://localhost:3000/api/projects/proj-1', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'DONE' }),
      })

      const res = await PATCH('proj-1' as any, request)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.status).toBe('DONE')
    })
  })

  describe('DELETE /api/projects/[id]', () => {
    it('deletes project', async () => {
      ;(prisma.project.delete as jest.Mock).mockResolvedValue({ id: 'proj-1' })

      const res = await DELETE('proj-1' as any)
      expect(res.status).toBe(200)
    })
  })
})
