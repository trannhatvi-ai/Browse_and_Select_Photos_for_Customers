import { FolderOpen, Clock, CheckCircle, HardDrive } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import type { StatsData } from '@/lib/types'

interface StatsCardsProps {
  stats: StatsData
}

const statConfig = [
  {
    key: 'totalProjects' as const,
    label: 'Tổng dự án',
    icon: FolderOpen,
    format: (v: number) => v.toString(),
  },
  {
    key: 'pendingReview' as const,
    label: 'Chờ duyệt',
    icon: Clock,
    format: (v: number) => v.toString(),
  },
  {
    key: 'completed' as const,
    label: 'Hoàn thành',
    icon: CheckCircle,
    format: (v: number) => v.toString(),
  },
  {
    key: 'storageUsed' as const,
    label: 'Dung lượng đã dùng',
    icon: HardDrive,
    format: (v: string) => v,
  },
]

export function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {statConfig.map((stat) => {
        const value = stats[stat.key]
        return (
          <Card key={stat.key}>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                <stat.icon className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-semibold text-foreground">
                  {typeof value === 'number' ? stat.format(value) : stat.format(value as string)}
                </p>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
