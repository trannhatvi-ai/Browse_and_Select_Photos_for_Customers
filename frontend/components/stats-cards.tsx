'use client'

import { useState, useEffect } from 'react'
import { FolderOpen, Clock, CheckCircle, HardDrive } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import type { StatsData } from '@/lib/types'

interface StatsCardsProps {
  stats: StatsData
}

export function StatsCards({ stats }: StatsCardsProps) {
  const [cloudUsage, setCloudUsage] = useState<any>(null)

  useEffect(() => {
    fetch('/api/cloudinary/usage')
      .then(res => res.ok ? res.json() : null)
      .then(data => setCloudUsage(data))
      .catch(() => {})
  }, [])

  const cards = [
    {
      label: 'Tổng dự án',
      icon: FolderOpen,
      value: stats.totalProjects.toString(),
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'Đang chọn',
      icon: Clock,
      value: stats.pendingReview.toString(),
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
    },
    {
      label: 'Hoàn thành',
      icon: CheckCircle,
      value: stats.completed.toString(),
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardContent className="flex items-center gap-4 p-6">
            <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${card.bgColor}`}>
              <card.icon className={`h-6 w-6 ${card.color}`} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{card.label}</p>
              <p className="text-2xl font-semibold text-foreground">{card.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Cloudinary Storage Card */}
      <Card>
        <CardContent className="p-6 space-y-3">
          <div className="flex items-center gap-4">
            <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${cloudUsage?.percentage > 80 ? 'bg-red-500/10' : 'bg-purple-500/10'}`}>
              <HardDrive className={`h-6 w-6 ${cloudUsage?.percentage > 80 ? 'text-red-500' : 'text-purple-500'}`} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-muted-foreground">Dung lượng Cloudinary</p>
              <p className="text-lg font-semibold text-foreground">
                {cloudUsage ? cloudUsage.usedFormatted : stats.storageUsed}
              </p>
            </div>
          </div>
          {cloudUsage && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{cloudUsage.usedFormatted} / {cloudUsage.limitFormatted}</span>
                <span className={cloudUsage.percentage > 80 ? 'text-red-500 font-medium' : ''}>{cloudUsage.percentage}%</span>
              </div>
              <Progress value={cloudUsage.percentage} className="h-1.5" />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
