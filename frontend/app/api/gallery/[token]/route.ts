import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createHash } from 'crypto'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const { searchParams } = new URL(req.url)
  const password = searchParams.get('password')

  const project = await prisma.project.findFirst({
    where: { accessToken: token },
    include: {
      photos: {
        orderBy: { uploadedAt: 'desc' },
        select: {
          id: true,
          filename: true,
          previewUrl: true,
          originalUrl: true,
          selected: true,
          comment: true,
        },
      },
    },
  })

  if (!project) {
    return NextResponse.json(
      { error: 'Không tìm thấy show chụp với mã truy cập này. Vui lòng kiểm tra lại.' },
      { status: 404 }
    )
  }

  // Check password if required
  if (project.accessPassword && project.accessPassword !== password) {
    return NextResponse.json(
      { error: 'Invalid password', requiresPassword: true },
      { status: 401 }
    )
  }

  // Add url_hash to each photo for reliable search matching (hash of originalUrl to match backend search results)
  const crypto = require('crypto')
  const enrichedPhotos = project.photos.map(photo => ({
    ...photo,
    url_hash: photo.originalUrl ? crypto.createHash('sha256').update(photo.originalUrl).digest('hex') : null
  }))

  const { accessToken, accessPassword, ...publicProject } = project
  return NextResponse.json({ ...publicProject, photos: enrichedPhotos })
}
