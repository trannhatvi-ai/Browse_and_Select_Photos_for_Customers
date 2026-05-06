import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getStorage } from '@/lib/storage'
import { applyWatermark } from '@/lib/watermark'
import { randomUUID } from 'crypto'
import path from 'path'

const storage = getStorage()

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params

  const photos = await prisma.photo.findMany({
    where: { projectId },
    orderBy: { uploadedAt: 'desc' },
    select: {
      id: true,
      filename: true,
      previewUrl: true,
      selected: true,
      comment: true,
    },
  })

  return NextResponse.json(photos)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params

  // Verify project exists
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  })

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  if (project.status !== 'UPLOADING') {
    return NextResponse.json(
      { error: 'Cannot upload photos: project not in UPLOADING status' },
      { status: 400 }
    )
  }

  // Parse multipart form
  const formData = await req.formData()
  const files = formData.getAll('files') as File[]

  if (!files || files.length === 0) {
    return NextResponse.json({ error: 'No files uploaded' }, { status: 400 })
  }

  const uploadedPhotos = []

  for (const file of files) {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      continue
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Generate unique filename with project prefix
    const ext = path.extname(file.name) || '.jpg'
    const filename = `${randomUUID()}${ext}`
    const originalPath = `projects/${projectId}/original/${filename}`
    const previewPath = `projects/${projectId}/preview/${filename}`

    try {
      // Save original
      await storage.save(originalPath, buffer)

      // Get watermark config from project
      const watermarkConfig = project.watermarkConfig || {}
      const opacity = watermarkConfig.opacity || 30
      const logoPath = watermarkConfig.logoUrl ? path.join('public', watermarkConfig.logoUrl) : undefined

      // Generate watermarked preview
      const previewBuffer = await applyWatermark(buffer, opacity, logoPath)
      await storage.save(previewPath, previewBuffer)

      // Create DB record
      const photo = await prisma.photo.create({
        data: {
          projectId,
          filename: file.name,
          originalUrl: originalPath,
          previewUrl: storage.getUrl(previewPath),
          width: 0, // TODO: extract from image
          height: 0,
          size: buffer.length,
        },
        select: {
          id: true,
          filename: true,
          previewUrl: true,
        },
      })

      uploadedPhotos.push(photo)

      // Increment project photo count
      await prisma.project.update({
        where: { id: projectId },
        data: { photoCount: { increment: 1 } },
      })
    } catch (err) {
      console.error('Failed to upload file:', file.name, err)
    }
  }

  return NextResponse.json(
    { uploaded: uploadedPhotos.length, photos: uploadedPhotos },
    { status: 201 }
  )
}
