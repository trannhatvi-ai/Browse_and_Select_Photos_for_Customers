import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const { searchParams } = new URL(req.url)
  const password = searchParams.get('password')

  const project = await prisma.project.findFirst({
    where: { accessToken: token },
    include: {
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
    },
  })

  if (!project) {
    return NextResponse.json(
      { error: 'Không tìm thấy dự án với mã truy cập này. Vui lòng kiểm tra lại.' },
      { status: 404 }
    )
  }

  // Check password if required
  if (project.accessPassword && project.accessPassword !== password) {
    return NextResponse.json(
      { error: 'Invalid password', requiresPassword: true },
      { status: 401 }
    )
  }

  const { accessToken, accessPassword, ...publicProject } = project
  return NextResponse.json(publicProject)
}
