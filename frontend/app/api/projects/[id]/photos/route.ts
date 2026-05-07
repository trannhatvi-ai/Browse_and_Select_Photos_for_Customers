import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { buildPreviewUrl } from '@/lib/storage'
import { buildBackendUrl } from '@/lib/backend-api'
import { getCloudinaryCredentialsForProject, validateUserCloudinarySettings } from '@/lib/cloudinary-settings'
import { v2 as cloudinary } from 'cloudinary'

// Cấu hình Cloudinary
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params
  
  // Lấy thông tin show chụp để kiểm tra owner
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { createdBy: true, createdAt: true, deadline: true },
  })
  
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }
  
  // Kiểm tra xem user đã cấu hình Cloudinary hay chưa
  const { isConfigured, missing } = await validateUserCloudinarySettings(project.createdBy)
  
  if (!isConfigured) {
    return NextResponse.json(
      {
        error: 'Cloudinary not configured',
        message: `Vui lòng cấu hình thông tin Cloudinary trước khi upload ảnh. Thiếu: ${missing?.join(', ')}`,
        configUrl: '/dashboard/settings'
      },
      { status: 400 }
    )
  }
  
  const credentials = await getCloudinaryCredentialsForProject(projectId)
  cloudinary.config(credentials)

  const formData = await req.formData()
  const files = formData.getAll('files') as File[]

  if (!files || files.length === 0) {
    return NextResponse.json({ error: 'No files uploaded' }, { status: 400 })
  }

  const uploadedPhotos = []

  for (const file of files) {
    if (!file.type.startsWith('image/')) continue

    try {
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      // Upload lên Cloudinary dưới dạng stream
      const uploadResult = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            folder: `proofing/${projectId}`,
            resource_type: 'image',
          },
          (error, result) => {
            if (error) reject(error)
            else resolve(result)
          }
        ).end(buffer)
      }) as any

      // Lưu vào Database
      const photo = await prisma.photo.create({
        data: {
          projectId,
          filename: file.name,
          originalUrl: uploadResult.public_id, // Lưu Public ID của Cloudinary
          previewUrl: buildPreviewUrl(uploadResult.public_id, credentials.cloud_name),
          width: uploadResult.width,
          height: uploadResult.height,
          size: uploadResult.bytes,
        },
      })

      uploadedPhotos.push(photo)
    } catch (err) {
      console.error('Cloudinary Upload Error:', err)
    }
  }

  // Không cập nhật photoCount vì field không tồn tại trong schema

  if (uploadedPhotos.length > 0) {
    try {
      const indexPayload = {
        project_id: projectId,
        urls: uploadedPhotos.map((photo: any) => photo.previewUrl),
        rebuild: false,
        project_created_at: project.createdAt.toISOString(),
        project_expires_at: project.deadline.toISOString(),
      }

      const indexResponse = await fetch(buildBackendUrl('/index'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(indexPayload),
        cache: 'no-store',
      })

      if (!indexResponse.ok) {
        const errorText = await indexResponse.text()
        console.error('Failed to queue indexing:', errorText)
      }
    } catch (error) {
      console.error('Failed to start indexing after upload:', error)
    }
  }

  return NextResponse.json({ success: true, uploaded: uploadedPhotos.length })
}

// DELETE /api/projects/[id]/photos — xóa ảnh từ Cloudinary + DB
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { photoId } = await req.json()
  const { id: projectId } = await params
  
  // Lấy thông tin show chụp để kiểm tra owner
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { createdBy: true },
  })
  
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }
  
  // Kiểm tra xem user đã cấu hình Cloudinary hay chưa
  const { isConfigured } = await validateUserCloudinarySettings(project.createdBy)
  
  if (!isConfigured) {
    return NextResponse.json(
      {
        error: 'Cloudinary not configured',
        message: 'Vui lòng cấu hình thông tin Cloudinary để quản lý ảnh.'
      },
      { status: 400 }
    )
  }
  
  const credentials = await getCloudinaryCredentialsForProject(projectId)
  cloudinary.config(credentials)
  
  if (!photoId) {
    return NextResponse.json({ error: 'Missing photoId' }, { status: 400 })
  }

  try {
    // Lấy thông tin ảnh trước khi xóa
    const photo = await prisma.photo.findUnique({ where: { id: photoId } })
    if (!photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 })
    }

    // Xóa trên Cloudinary (originalUrl chứa public_id)
    try {
      await cloudinary.uploader.destroy(photo.originalUrl)
    } catch (err) {
      console.error('Cloudinary delete error:', err)
    }

    // Xóa trong Database
    await prisma.photo.delete({ where: { id: photoId } })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
