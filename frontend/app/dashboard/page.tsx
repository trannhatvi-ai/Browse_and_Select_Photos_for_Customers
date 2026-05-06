import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatsCards } from '@/components/stats-cards'
import { ProjectsTable } from '@/components/projects-table'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  
  let projects: any[] = []
  let allProjects: any[] = []
  
  if (session?.user?.id) {
    try {
      if (session.user.role === 'ADMIN') {
        projects = await prisma.project.findMany({
          orderBy: { createdAt: 'desc' },
          take: 5
        })
        allProjects = await prisma.project.findMany({})
      } else {
        projects = await prisma.project.findMany({
          where: { createdBy: session.user.id },
          orderBy: { createdAt: 'desc' },
          take: 5
        })
        allProjects = await prisma.project.findMany({ where: { createdBy: session.user.id } })
      }
    } catch (e) {}
  }

  const stats = {
    totalProjects: allProjects.length,
    pendingReview: allProjects.filter(p => p.status === 'CHOOSING').length,
    completed: allProjects.filter(p => p.status === 'DONE').length,
    storageUsed: '0 B'
  }

  // compute storage used (sum of photo.size) for scope (admin: all, studio: own)
  try {
    const wherePhoto: any = session?.user?.role === 'ADMIN' ? {} : { project: { createdBy: session?.user?.id } }
    const agg = await prisma.photo.aggregate({
      _sum: { size: true },
      where: wherePhoto,
    })
    const bytes = agg._sum.size || 0
    const human = formatBytes(bytes)
    stats.storageUsed = human
  } catch (e) {}

  function formatBytes(bytes: number) {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Dự án của tôi</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Quản lý các dự án chọn ảnh của bạn
          </p>
        </div>
        {/* Desktop button only */}
        <Button asChild className="hidden md:flex">
          <Link href="/dashboard/new-project">
            <Plus className="mr-2 h-4 w-4" />
            Dự án mới
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <StatsCards stats={stats} />

      {/* Projects Section */}
      <div>
        <h2 className="mb-4 text-lg font-medium text-foreground">Dự án gần đây</h2>
        <ProjectsTable projects={projects} />
      </div>

      {/* Mobile FAB - Floating Action Button */}
      <Button asChild size="icon" className="md:hidden fixed bottom-24 right-4 z-50 h-14 w-14 rounded-full shadow-lg">
        <Link href="/dashboard/new-project">
          <Plus className="h-6 w-6" />
        </Link>
      </Button>
    </div>
  )
}
