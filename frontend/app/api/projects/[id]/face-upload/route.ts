import { NextRequest, NextResponse } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'
import { getCloudinaryCredentialsForProject, validateUserCloudinarySettings } from '@/lib/cloudinary-settings'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params

  const project = await fetchProjectOwner(projectId)
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  const { isConfigured, missing } = await validateUserCloudinarySettings(project.createdBy)
  if (!isConfigured) {
    return NextResponse.json(
      {
        error: 'Cloudinary not configured',
        message: `Vui lòng cấu hình thông tin Cloudinary trước khi quét mặt. Thiếu: ${missing?.join(', ')}`,
      },
      { status: 400 }
    )
  }

  const formData = await req.formData()
  const file = formData.get('file')

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
  }

  const credentials = await getCloudinaryCredentialsForProject(projectId)
  cloudinary.config(credentials)

  try {
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const uploadResult = await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder: `proofing/${projectId}/face-search`,
            resource_type: 'image',
          },
          (error, result) => {
            if (error) reject(error)
            else resolve(result)
          }
        )
        .end(buffer)
    }) as any

    return NextResponse.json({
      success: true,
      public_id: uploadResult.public_id,
      secure_url: uploadResult.secure_url,
      url: uploadResult.url,
    })
  } catch (error: any) {
    console.error('Face upload error:', error)
    return NextResponse.json(
      { error: error?.message || 'Cloudinary upload failed' },
      { status: 500 }
    )
  }
}

async function fetchProjectOwner(projectId: string) {
  const { prisma } = await import('@/lib/db')

  return prisma.project.findUnique({
    where: { id: projectId },
    select: { createdBy: true },
  })
}