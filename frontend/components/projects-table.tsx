'use client'

import Link from 'next/link'
import { Eye, MoreHorizontal } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { Project } from '@/lib/types'

interface ProjectsTableProps {
  projects: Project[]
}

const statusConfig: Record<
  Project['status'],
  { label: string; variant: 'default' | 'secondary' | 'outline' }
> = {
  uploading: { label: 'Đang tải lên', variant: 'secondary' },
  choosing: { label: 'Đang chọn', variant: 'default' },
  done: { label: 'Hoàn thành', variant: 'outline' },
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('vi-VN', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  })
}

export function ProjectsTable({ projects }: ProjectsTableProps) {
  return (
    <div className="rounded-lg border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tên khách hàng</TableHead>
            <TableHead>Tên sự kiện</TableHead>
            <TableHead>Ngày sự kiện</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead>Hạn chót</TableHead>
            <TableHead className="text-right">Thao tác</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.map((project) => {
            const status = statusConfig[project.status]
            return (
              <TableRow
                key={project.id}
                className="group transition-colors hover:bg-muted/50"
              >
                <TableCell className="font-medium">{project.clientName}</TableCell>
                <TableCell>{project.eventName}</TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(project.eventDate)}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={status.variant}
                    className={cn(
                      project.status === 'choosing' && 'bg-accent text-accent-foreground',
                      project.status === 'done' && 'bg-emerald-100 text-emerald-700 border-emerald-200'
                    )}
                  >
                    {status.label}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(project.deadline)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/dashboard/projects/${project.id}`}>
                        <Eye className="mr-1.5 h-4 w-4" />
                        Xem
                      </Link>
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Tùy chọn khác</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Chỉnh sửa dự án</DropdownMenuItem>
                        <DropdownMenuItem>Gửi nhắc nhở</DropdownMenuItem>
                        <DropdownMenuItem>Tải xuống ảnh</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          Xóa dự án
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
