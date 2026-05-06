import { GET, POST } from './route'
import { prisma } from '@/lib/db'

// Mock prisma globally before imports
jest.mock('@/lib/db', () => ({
  prisma: {
    project: {
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
    },
  },
}))

describe('Projects API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/projects', () => {
    it('returns list of projects', async () => {
      const mockProjects = [
        {
          id: '1',
          clientName: 'Sarah Johnson',
          eventName: 'Wedding',
          eventDate: new Date('2024-06-15'),
          status: 'CHOOSING',
          deadline: new Date('2024-07-01'),
          photoCount: 100,
          selectedCount: 10,
          maxSelections: 50,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      ;(prisma.project.findMany as jest.Mock).mockResolvedValue(mockProjects)

      const res = await GET()
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBe(1)
    })

    it('supports status filter', async () => {
      await GET()
      expect(prisma.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'CHOOSING',
          }),
        })
      )
    })
  })

  describe('POST /api/projects', () => {
    it('creates a new project', async () => {
      const mockProject = {
        id: 'new-123',
        clientName: 'Test Client',
        clientEmail: 'test@example.com',
        eventName: 'Test Event',
        eventDate: new Date('2024-12-01'),
        deadline: new Date('2024-12-15'),
        maxSelections: 30,
        status: 'UPLOADING',
        accessToken: 'abc123',
        createdBy: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      ;(prisma.project.create as jest.Mock).mockResolvedValue(mockProject)

      const request = new Request('http://localhost:3000/api/projects', {
        method: 'POST',
        body: JSON.stringify({
          clientName: 'Test Client',
          clientEmail: 'test@example.com',
          eventName: 'Test Event',
          eventDate: '2024-12-01',
          deadline: '2024-12-15',
          maxSelections: 30,
        }),
      })

      const res = await POST(request)
      const data = await res.json()

      expect(res.status).toBe(201)
      expect(data.clientName).toBe('Test Client')
      expect(prisma.project.create).toHaveBeenCalled()
    })

    it('validates required fields', async () => {
      const request = new Request('http://localhost:3000/api/projects', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const res = await POST(request)
      expect(res.status).toBe(400)
    })
  })
})
