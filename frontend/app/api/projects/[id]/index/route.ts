import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { buildBackendUrl } from '@/lib/backend-api'
import { syncProjectPhotoAiContexts } from '@/lib/ai-context-sync'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params
  
  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { photos: true },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    if (project.photos.length === 0) {
      return NextResponse.json({ message: 'No photos to index' })
    }

    const indexPayload = {
      project_id: projectId,
      urls: project.photos.map((p) => p.previewUrl),
      rebuild: true, // Force rebuild to update local Redis
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
      throw new Error(`Backend failed: ${errorText}`)
    }

    const data = await indexResponse.json()
    const synced = await syncProjectPhotoAiContexts(projectId, project.photos.map((photo) => photo.previewUrl))
    return NextResponse.json({ success: true, ...data, synced })
  } catch (error: any) {
    console.error('Failed to trigger re-indexing:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
