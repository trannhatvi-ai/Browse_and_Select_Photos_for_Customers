import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const body = await req.json()
  const { selections } = body // Mảng chứa ID các ảnh được chọn và comment

  const project = await prisma.project.findFirst({
    where: { accessToken: token }
  })

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  // Cập nhật trạng thái lựa chọn cho từng ảnh
  // Chúng ta sẽ reset tất cả ảnh của project này về selected: false trước
  await prisma.photo.updateMany({
    where: { projectId: project.id },
    data: { selected: false, comment: '' }
  })

  // Sau đó cập nhật các ảnh khách đã chọn
  if (Array.isArray(selections)) {
    for (const selection of selections) {
    await prisma.photo.update({
      where: { id: selection.id },
      data: { 
        selected: true,
        comment: selection.comment || ''
      }
    })
  }
}

  // Cập nhật trạng thái project sang DONE nếu cần, hoặc giữ nguyên CHOOSING
  await prisma.project.update({
    where: { id: project.id },
    data: { status: 'DONE' }
  })

  return NextResponse.json({ success: true })
}
