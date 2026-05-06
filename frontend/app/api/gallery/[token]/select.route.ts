import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const body = await req.json()
  const { selections } = body // Array of { photoId, comment? }

  if (!Array.isArray(selections) || selections.length === 0) {
    return NextResponse.json({ error: 'No selections provided' }, { status: 400 })
  }

  // Find project by token
  const project = await prisma.project.findFirst({
    where: { accessToken: token },
  })

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  // Only allow selection if project is in CHOOSING status
  if (project.status !== 'CHOOSING') {
    return NextResponse.json(
      { error: 'Selection period has ended' },
      { status: 400 }
    )
  }

  // Check total selections limit
  const newSelectionCount = selections.length
  if (project.selectedCount + newSelectionCount > project.maxSelections) {
    return NextResponse.json(
      { error: `Cannot select more than ${project.maxSelections} photos` },
      { status: 400 }
    )
  }

  // Verify all photo IDs belong to this project
  const photoIds = selections.map((s: any) => s.photoId)
  const validPhotos = await prisma.photo.findMany({
    where: { id: { in: photoIds }, projectId: project.id },
  })

  if (validPhotos.length !== photoIds.length) {
    return NextResponse.json(
      { error: 'Some photos are invalid or do not belong to this project' },
      { status: 400 }
    )
  }

  // Record selections (upsert: if exists update comment, else create)
  for (const sel of selections) {
    await prisma.selection.upsert({
      where: {
        photoId_projectId: {
          photoId: sel.photoId,
          projectId: project.id,
        },
      },
      create: {
        projectId: project.id,
        photoId: sel.photoId,
        comment: sel.comment || null,
      },
      update: {
        comment: sel.comment || null,
      },
    })

    // Mark photo as selected
    await prisma.photo.update({
      where: { id: sel.photoId },
      data: { selected: true },
    })
  }

  // Update project selected count
  await prisma.project.update({
    where: { id: project.id },
    data: { selectedCount: { increment: newSelectionCount } },
  })

  return NextResponse.json({
    success: true,
    selectedCount: project.selectedCount + newSelectionCount,
  })
}
