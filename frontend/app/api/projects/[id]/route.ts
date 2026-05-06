import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const project = await prisma.project.findUnique({
    where: { id },
    select: {
      id: true,
      clientName: true,
      clientEmail: true,
      eventName: true,
      eventDate: true,
      deadline: true,
      maxSelections: true,
      status: true,
      watermarkConfig: true,
      accessToken: true,
      photos: {
        orderBy: { uploadedAt: 'desc' },
        select: {
          id: true,
          filename: true,
          previewUrl: true,
          selected: true,
          comment: true,
        },
      },
      createdAt: true,
    },
  })

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  return NextResponse.json(project)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()

  const allowedFields = ['status', 'maxSelections', 'deadline']
  const updates: any = {}

  for (const key of allowedFields) {
    if (body[key] !== undefined) {
      updates[key] = key === 'deadline' ? new Date(body[key]) : body[key]
    }
  }

  const project = await prisma.project.update({
    where: { id },
    data: updates,
    select: {
      id: true,
      status: true,
      maxSelections: true,
      deadline: true,
      updatedAt: true,
    },
  })

  return NextResponse.json(project)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  await prisma.project.delete({
    where: { id },
  })

  return NextResponse.json({ success: true })
}
