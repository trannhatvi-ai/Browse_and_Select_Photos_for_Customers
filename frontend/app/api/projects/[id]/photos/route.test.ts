import { POST, DELETE } from './route'
import { prisma } from '@/lib/db'
import { getStorage } from '@/lib/storage'
import { applyWatermark } from '@/lib/watermark'
import { randomUUID } from 'crypto'

jest.mock('@/lib/db')
jest.mock('@/lib/storage')
jest.mock('@/lib/watermark')
jest.mock('crypto')

describe('Photos API', () => {
  const mockStorage = {
    save: jest.fn(),
    getUrl: jest.fn(() => '/storage/test.jpg'),
  }
  const mockPrisma = prisma as any

  beforeEach(() => {
    jest.clearAllMocks()
    ;(getStorage as jest.Mock).mockReturnValue(mockStorage)
    ;(applyWatermark as jest.Mock).mockResolvedValue(Buffer.from('watermarked'))
    ;(randomUUID as any).mockReturnValue('photo-uuid-123')
  })

  describe('POST /api/projects/[id]/photos', () => {
    it('uploads photo and creates DB record', async () => {
      mockPrisma.project.findUnique = jest.fn().mockResolvedValue({
        id: 'proj-1',
        status: 'UPLOADING',
      })
      mockPrisma.photo.create = jest.fn().mockResolvedValue({
        id: 'photo-1',
        filename: 'test.jpg',
        previewUrl: '/storage/preview.jpg',
      })

      const formData = new FormData()
      const fileBlob = new Blob(['fake image'], { type: 'image/jpeg' })
      formData.append('file', fileBlob, 'test.jpg')

      const req = new Request('http://localhost:3000/api/projects/proj-1/photos', {
        method: 'POST',
        body: formData,
      })

      const res = await POST('proj-1' as any, req)
      const data = await res.json()

      expect(res.status).toBe(201)
      expect(mockStorage.save).toHaveBeenCalled()
      expect(applyWatermark).toHaveBeenCalled()
    })
  })

  describe('DELETE /api/projects/[id]/photos/[photoId]', () => {
    it('deletes photo and file', async () => {
      mockPrisma.photo.findUnique = jest.fn().mockResolvedValue({
        id: 'photo-1',
        originalUrl: '/storage/original.jpg',
        previewUrl: '/storage/preview.jpg',
      })
      mockPrisma.photo.delete = jest.fn().mockResolvedValue({ id: 'photo-1' })

      const res = await DELETE('proj-1' as any, 'photo-1' as any)
      expect(res.status).toBe(200)
    })
  })
})
