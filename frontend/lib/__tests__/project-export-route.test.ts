import { GET } from '../../app/api/projects/[id]/export/route'
import { prisma } from '@/lib/db'

jest.mock('@/lib/db', () => ({
  prisma: {
    project: {
      findUnique: jest.fn(),
    },
  },
}))

const selectedProject = {
  id: 'project-1',
  clientName: 'Nguyen Studio',
  eventName: 'Wedding Album',
  accessToken: 'token-123',
  photos: [
    {
      id: 'photo-1',
      filename: 'IMG_0001.CR3',
      comment: 'retouch skin',
      originalUrl: 'cloudinary/original-1',
    },
    {
      id: 'photo-2',
      filename: 'IMG_0002.CR3',
      comment: null,
      originalUrl: 'cloudinary/original-2',
    },
  ],
}

function requestFor(format?: string) {
  const suffix = format ? `?format=${format}` : ''
  return new Request(`http://localhost:3000/api/projects/project-1/export${suffix}`) as any
}

function routeContext() {
  return { params: Promise.resolve({ id: 'project-1' }) }
}

describe('GET /api/projects/[id]/export', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(prisma.project.findUnique as jest.Mock).mockResolvedValue(selectedProject)
  })

  it('exports selected filenames as one TXT line per file for local filtering', async () => {
    const response = await GET(requestFor('txt'), routeContext())
    const body = await response.text()

    expect(response.headers.get('Content-Type')).toContain('text/plain')
    expect(response.headers.get('Content-Disposition')).toContain('.txt')
    expect(body).toContain('IMG_0001.CR3\nIMG_0002.CR3')
    expect(body).not.toContain('IMG_0001.CR3, IMG_0002.CR3')
  })

  it('exports CSV with comments and original URLs for studio review', async () => {
    const response = await GET(requestFor('csv'), routeContext())
    const body = await response.text()

    expect(response.headers.get('Content-Type')).toContain('text/csv')
    expect(response.headers.get('Content-Disposition')).toContain('.csv')
    expect(body).toContain('filename,comment,originalUrl')
    expect(body).toContain('"IMG_0001.CR3","retouch skin","cloudinary/original-1"')
    expect(body).toContain('"IMG_0002.CR3","","cloudinary/original-2"')
  })

  it('exports a PowerShell copy script with user instructions and selected filenames', async () => {
    const response = await GET(requestFor('ps1'), routeContext())
    const body = await response.text()

    expect(response.headers.get('Content-Type')).toContain('text/plain')
    expect(response.headers.get('Content-Disposition')).toContain('.ps1')
    expect(body).toContain('Copy selected photos into SELECTED')
    expect(body).toContain('$selectedFiles = @(')
    expect(body).toContain('"IMG_0001.CR3"')
    expect(body).toContain('"IMG_0002.CR3"')
    expect(body).toContain('New-Item -ItemType Directory -Path $destination')
  })
})
