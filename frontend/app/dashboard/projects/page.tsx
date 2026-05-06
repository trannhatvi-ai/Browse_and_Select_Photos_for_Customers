import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProjectsTable } from '@/components/projects-table'
import { mockProjects } from '@/lib/mock-data'

export default function ProjectsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Tất cả dự án</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Xem và quản lý tất cả dự án chọn ảnh của bạn
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/new-project">
            <Plus className="mr-2 h-4 w-4" />
            Dự án mới
          </Link>
        </Button>
      </div>

      <ProjectsTable projects={mockProjects} />
    </div>
  )
}
