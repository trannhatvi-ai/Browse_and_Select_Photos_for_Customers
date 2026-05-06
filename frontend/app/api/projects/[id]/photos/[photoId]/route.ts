import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getStorage } from '@/lib/storage'

const storage = getStorage()

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; photoId: string }> }
) {
  const { id: projectId, photoId } = await params

  const photo = await prisma.photo.findUnique({
    where: { id: photoId, projectId },
  })

  if (!photo) {
    return NextResponse.json({ error: 'Photo not found' }, { status: 404 })
  }

  // Delete files from storage
  try {
    await storage.delete(photo.originalUrl)
    await storage.delete(photo.previewUrl)
  } catch (err) {
    console.error('Failed to delete files:', err)
  }

  // Delete DB record
  await prisma.photo.delete({ where: { id: photoId } })

  // Decrement project photo count
  await prisma.project.update({
    where: { id: projectId },
    data: { photoCount: { decrement: 1 } },
  })

  return NextResponse.json({ success: true })
}
