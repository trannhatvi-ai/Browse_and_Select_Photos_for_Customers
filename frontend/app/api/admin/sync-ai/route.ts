import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { buildBackendUrl } from '@/lib/backend-api'
import { prisma } from '@/lib/db'
import { syncProjectPhotoAiContexts } from '@/lib/ai-context-sync'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized. Admin only.' }, { status: 401 })
  }

  try {
    // Parse fullRebuild from query parameters (default: true for backward compatibility)
    const url = new URL(req.url)
    const fullRebuild = url.searchParams.get('fullRebuild') !== 'false'

    // 1. Lấy tất cả project cùng với danh sách previewUrl của ảnh từ Supabase
    const projects = await prisma.project.findMany({
      select: {
        id: true,
        createdAt: true,
        deadline: true,
        photos: {
          select: {
            previewUrl: true
          }
        }
      }
    })

    if (projects.length === 0) {
      return NextResponse.json({ message: 'No projects found in database', queued_count: 0 })
    }

    let totalQueued = 0
    const errors: string[] = []

    // 2. Duyệt qua từng project và gửi yêu cầu index cho AI Backend
    // Lưu ý: AI Backend xử lý async (202 Accepted) nên loop này sẽ chạy nhanh
    for (const project of projects) {
      if (project.photos.length === 0) continue

      try {
        const indexPayload = {
          project_id: project.id,
          urls: project.photos.map(p => p.previewUrl),
          rebuild: fullRebuild,
          project_created_at: project.createdAt.toISOString(),
          project_expires_at: project.deadline.toISOString()
        }

        const res = await fetch(buildBackendUrl('/index'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(indexPayload),
          cache: 'no-store'
        })

        if (res.ok) {
          await syncProjectPhotoAiContexts(project.id, project.photos.map(p => p.previewUrl))
          totalQueued++
        } else {
          errors.push(`Project ${project.id}: Backend returned ${res.status}`)
        }
      } catch (err) {
        errors.push(`Project ${project.id}: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    }

    return NextResponse.json({
      status: 'processing',
      queued_count: totalQueued,
      failed_count: projects.length - totalQueued,
      message: `Started re-indexing for ${totalQueued} projects from Supabase.`,
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (error) {
    console.error('Deep Sync AI Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    )
  }
}
