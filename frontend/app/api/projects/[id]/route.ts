import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { v2 as cloudinary } from 'cloudinary'
import { buildBackendUrl } from '@/lib/backend-api'
import { resolveCloudinaryAccountForPhoto, type ResolvedCloudinaryAccount } from '@/lib/cloudinary-accounts'

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
    status?: 'CHOOSING' | 'DONE'
    maxSelections?: number
    eventName?: string
    clientName?: string
    clientEmail?: string
  } = {}

  if (typeof body.status === 'string') {
    if (!allowedStatuses.has(body.status)) {
      return NextResponse.json(
        { error: 'status must be CHOOSING or DONE' },
        { status: 400 }
      )
    }
    updateData.status = body.status as 'CHOOSING' | 'DONE'
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

  if (typeof body.eventName === 'string' && body.eventName.trim()) {
    updateData.eventName = body.eventName.trim()
  }

  if (typeof body.clientName === 'string' && body.clientName.trim()) {
    updateData.clientName = body.clientName.trim()
  }

  if (typeof body.clientEmail === 'string' && body.clientEmail.trim()) {
    updateData.clientEmail = body.clientEmail.trim()
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
  
  // 1. Lấy tất cả ảnh của show chụp
  const photos = await prisma.photo.findMany({
    where: { projectId: id },
    select: {
      originalUrl: true,
      previewUrl: true,
      cloudinaryAccountId: true,
      cloudinaryCloudName: true,
    },
  })

  // 2. Xóa từng ảnh trên Cloudinary
  const cleanupAccounts = new Map<string, ResolvedCloudinaryAccount>()
  for (const photo of photos) {
    try {
      const account = await resolveCloudinaryAccountForPhoto(project.createdBy, photo as any)
      if (account) {
        cloudinary.config(account)
        cleanupAccounts.set(account.id || account.cloudName, account)
      }
      await cloudinary.uploader.destroy(photo.originalUrl)
    } catch (err) {
      console.error('Cloudinary delete error:', err)
    }
  }

  // 3. Xóa toàn bộ folder show chụp trên Cloudinary (nếu có)
  for (const account of cleanupAccounts.values()) {
    try {
      cloudinary.config(account)
      await cloudinary.api.delete_folder(`proofing/${id}`)
    } catch {}
  }

  // 4. Xóa show chụp trong DB (cascade sẽ xóa photos + selections)
  await prisma.project.delete({ where: { id } })

  // 5. Best-effort cleanup AI vectors in backend Qdrant
  try {
    const cleanupResponse = await fetch(buildBackendUrl(`/projects/${id}/vectors`), {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    })
    if (!cleanupResponse.ok) {
      console.error(`AI vector cleanup returned ${cleanupResponse.status} for project ${id}`)
    }
  } catch (err) {
    console.error('AI vector cleanup error:', err)
  }

  return NextResponse.json({ success: true })
}
