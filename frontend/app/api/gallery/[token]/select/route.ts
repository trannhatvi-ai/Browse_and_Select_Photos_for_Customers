import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sendStudioNotification } from '@/lib/notifications'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const body = await req.json()
  const { selections } = body // Mảng chứa ID các ảnh được chọn và comment

  const project = await prisma.project.findFirst({
    where: { accessToken: token },
    include: { createdByUser: true }
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
  let selectedCount = 0
  if (Array.isArray(selections)) {
    for (const selection of selections) {
      await prisma.photo.update({
        where: { id: selection.id },
        data: { 
          selected: true,
          comment: selection.comment || ''
        }
      })
      selectedCount++
    }
  }

  // Cập nhật trạng thái project sang DONE nếu cần, hoặc giữ nguyên CHOOSING
  await prisma.project.update({
    where: { id: project.id },
    data: { status: 'DONE' }
  })

  // Gửi thông báo tới studio qua tất cả kênh
  try {
    await sendStudioNotification({
      userId: project.createdByUser.id,
      subject: `Khách đã hoàn thành chọn ảnh: ${project.eventName}`,
      message: `Khách hàng ${project.clientName} đã hoàn thành chọn ảnh cho sự kiện "${project.eventName}".\n\nSố ảnh được chọn: ${selectedCount} ảnh\n\nVui lòng kiểm tra lại các ảnh đã chọn và xử lý tiếp theo.`,
      scheduleId: project.id,
    })
  } catch (err) {
    console.error('Failed to send notifications:', err)
    // Không throw error - selection vẫn được lưu, chỉ notification thất bại
  }

  return NextResponse.json({ success: true })
}
