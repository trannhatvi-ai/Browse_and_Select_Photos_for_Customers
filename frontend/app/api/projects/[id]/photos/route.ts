import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { buildPreviewUrl } from '@/lib/storage'
import { buildBackendUrl } from '@/lib/backend-api'
import { syncProjectPhotoAiContexts } from '@/lib/ai-context-sync'
import { getCloudinaryCredentialsForProject, validateExistingProjectCloudinarySettings } from '@/lib/cloudinary-settings'
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
  const { isConfigured, missing } = await validateExistingProjectCloudinarySettings(project.createdBy)
  
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
    // Không tự động gọi AI nữa, người dùng sẽ nhấn nút thủ công ở Frontend
    console.log(`Uploaded ${uploadedPhotos.length} photos for project ${projectId}. Waiting for manual AI trigger.`)
  }

  return NextResponse.json({ 
    success: true, 
    uploaded: uploadedPhotos.length,
    photos: uploadedPhotos // Return photos so frontend can index them
  })
}

// DELETE /api/projects/[id]/photos — xóa ảnh từ Cloudinary + DB (hỗ trợ xóa hàng loạt)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const body = await req.json()
  const { photoId, photoIds } = body
  const { id: projectId } = await params
  
  // Chấp nhận cả 1 id lẻ hoặc 1 mảng id
  const idsToDelete = photoIds || (photoId ? [photoId] : [])
  
  if (!idsToDelete || idsToDelete.length === 0) {
    return NextResponse.json({ error: 'Missing photoId or photoIds' }, { status: 400 })
  }

  // Lấy thông tin show chụp để kiểm tra owner
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { createdBy: true },
  })
  
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }
  
  const credentials = await getCloudinaryCredentialsForProject(projectId)
  cloudinary.config(credentials)
  
  try {
    const results = []
    const cancelledUrls = []

    for (const id of idsToDelete) {
      try {
        // Lấy thông tin ảnh trước khi xóa
        const photo = await prisma.photo.findUnique({ where: { id } })
        if (!photo) continue

        // Xóa trên Cloudinary (originalUrl chứa public_id)
        try {
          await cloudinary.uploader.destroy(photo.originalUrl)
        } catch (err) {
          console.error(`Cloudinary delete error for ${id}:`, err)
        }

        // Xóa trong Database
        await prisma.photo.delete({ where: { id } })
        
        cancelledUrls.push(photo.previewUrl)
        results.push({ id, success: true })
      } catch (err) {
        console.error(`Error deleting photo ${id}:`, err)
        results.push({ id, success: false, error: (err as Error).message })
      }
    }

    // Thông báo cho Python backend để dừng xử lý AI nếu đang chạy
    if (cancelledUrls.length > 0) {
      try {
        fetch(buildBackendUrl('/cancel'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project_id: projectId,
            urls: cancelledUrls
          }),
        }).catch(err => console.error('Failed to notify cancel to backend:', err))
      } catch (error) {
        console.error('Error triggering cancellation:', error)
      }
    }

    return NextResponse.json({ 
      success: true, 
      count: results.filter(r => r.success).length,
      details: results 
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
