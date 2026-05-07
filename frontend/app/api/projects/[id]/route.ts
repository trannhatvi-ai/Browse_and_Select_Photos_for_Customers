import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { v2 as cloudinary } from 'cloudinary'
import { getCloudinaryCredentialsForProject, validateUserCloudinarySettings } from '@/lib/cloudinary-settings'

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json()
  const allowedStatuses = new Set(['CHOOSING', 'DONE'])

  const updateData: {
    status?: string
    maxSelections?: number
  } = {}

  if (typeof body.status === 'string') {
    if (!allowedStatuses.has(body.status)) {
      return NextResponse.json(
        { error: 'status must be CHOOSING or DONE' },
        { status: 400 }
      )
    }
    updateData.status = body.status
  }

  if (body.maxSelections !== undefined) {
    const parsedMaxSelections = Number(body.maxSelections)

    if (!Number.isInteger(parsedMaxSelections) || parsedMaxSelections < 1) {
      return NextResponse.json(
        { error: 'maxSelections must be a positive integer' },
        { status: 400 }
      )
    }

    updateData.maxSelections = parsedMaxSelections
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const project = await prisma.project.update({
    where: { id },
    data: updateData,
  })

  return NextResponse.json(project)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  
  // Lấy thông tin show chụp để kiểm tra owner
  const project = await prisma.project.findUnique({
    where: { id },
    select: { createdBy: true },
  })
  
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }
  
  const credentials = await getCloudinaryCredentialsForProject(id)
  cloudinary.config(credentials)

  // 1. Lấy tất cả ảnh của show chụp
  const photos = await prisma.photo.findMany({
    where: { projectId: id },
    select: { originalUrl: true }
  })

  // 2. Xóa từng ảnh trên Cloudinary
  for (const photo of photos) {
    try {
      await cloudinary.uploader.destroy(photo.originalUrl)
    } catch (err) {
      console.error('Cloudinary delete error:', err)
    }
  }

  // 3. Xóa toàn bộ folder show chụp trên Cloudinary (nếu có)
  try {
    await cloudinary.api.delete_folder(`proofing/${id}`)
  } catch {}

  // 4. Xóa show chụp trong DB (cascade sẽ xóa photos + selections)
  await prisma.project.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
