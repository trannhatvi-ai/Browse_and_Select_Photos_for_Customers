import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      photos: {
        where: { selected: true }
      }
    }
  })

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  // Tạo nội dung file text: Danh sách tên file phân tách bằng dấu phẩy
  const fileList = project.photos.map(p => p.filename).join(', ')
  
  const content = `DỰ ÁN: ${project.eventName}\nKHÁCH HÀNG: ${project.clientName}\nNGÀY CHỌN: ${new Date().toLocaleDateString('vi-VN')}\n\nDANH SÁCH FILE CHỌN (${project.photos.length} ảnh):\n${fileList}`

  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `attachment; filename="Selected_Photos_${project.accessToken}.txt"`
    }
  })
}
