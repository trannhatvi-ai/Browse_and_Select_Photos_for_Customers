import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatsCards } from '@/components/stats-cards'
import { ProjectsTable } from '@/components/projects-table'
import { mockProjects, mockStats } from '@/lib/mock-data'

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Dự án của tôi</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Quản lý các dự án chọn ảnh của bạn
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/new-project">
            <Plus className="mr-2 h-4 w-4" />
            Dự án mới
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <StatsCards stats={mockStats} />

      {/* Projects Table */}
      <div>
        <h2 className="mb-4 text-lg font-medium text-foreground">Dự án gần đây</h2>
        <ProjectsTable projects={mockProjects} />
      </div>
    </div>
  )
}
