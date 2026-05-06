import { GET } from './route'
import { prisma } from '@/lib/db'

jest.mock('@/lib/db', () => ({
  prisma: {
    photo: {
      findMany: jest.fn(),
    },
  },
}))

describe('List Photos API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('lists photos for a project', async () => {
    const mockPhotos = [
      { id: '1', filename: 'img1.jpg', previewUrl: '/storage/1', selected: false },
      { id: '2', filename: 'img2.jpg', previewUrl: '/storage/2', selected: true },
    ]

    ;(prisma.photo.findMany as jest.Mock).mockResolvedValue(mockPhotos)

    const res = await GET('proj-1' as any)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(Array.isArray(data)).toBe(true)
    expect(data.length).toBe(2)
  })
})
