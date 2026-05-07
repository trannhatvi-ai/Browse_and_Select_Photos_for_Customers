'use client'

import { useState, useEffect } from 'react'
import { FolderOpen, Clock, CheckCircle, HardDrive } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import type { StatsData } from '@/lib/types'

interface StatsCardsProps {
  stats: StatsData
}

export function StatsCards({ stats }: StatsCardsProps) {
  const [cloudUsage, setCloudUsage] = useState<any>(null)
  const [cloudLoading, setCloudLoading] = useState(true)

  useEffect(() => {
    setCloudLoading(true)
    fetch('/api/cloudinary/usage')
      .then(res => res.ok ? res.json() : null)
      .then(data => setCloudUsage(data))
      .catch(() => {})
      .finally(() => setCloudLoading(false))
  }, [])

  const cards = [
    {
      label: 'Tổng show chụp',
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
    <>
      <div className="grid gap-3 sm:hidden">
        <Card className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Tổng quan</p>
                <p className="mt-1 text-sm font-medium text-foreground">4 chỉ số chính</p>
              </div>
              <div className={`flex h-10 w-10 items-center justify-center rounded-full ${cloudUsage?.percentage > 80 ? 'bg-red-500/10' : 'bg-purple-500/10'}`}>
                <HardDrive className={`h-5 w-5 ${cloudUsage?.percentage > 80 ? 'text-red-500' : 'text-purple-500'}`} />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              {cards.map((card) => (
                <div key={card.label} className="rounded-2xl border border-border/60 bg-muted/30 p-3">
                  <div className="flex items-center gap-2">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full ${card.bgColor}`}>
                      <card.icon className={`h-4 w-4 ${card.color}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] leading-4 text-muted-foreground">{card.label}</p>
                      <p className="text-xl font-semibold leading-6 text-foreground">{card.value}</p>
                    </div>
                  </div>
                </div>
              ))}

              <div className="col-span-2 rounded-2xl border border-border/60 bg-muted/20 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full ${cloudUsage?.percentage > 80 ? 'bg-red-500/10' : 'bg-purple-500/10'}`}>
                      <HardDrive className={`h-4 w-4 ${cloudUsage?.percentage > 80 ? 'text-red-500' : 'text-purple-500'}`} />
                    </div>
                    <div>
                      <p className="text-[11px] leading-4 text-muted-foreground">Dung lượng</p>
                      <p className="text-sm font-semibold text-foreground">
                        {cloudLoading ? (
                          <span className="inline-block h-4 w-20 rounded bg-muted animate-pulse" />
                        ) : (
                          cloudUsage ? cloudUsage.usedFormatted : stats.storageUsed
                        )}
                      </p>
                    </div>
                  </div>
                  {!cloudLoading && cloudUsage && (
                    <span className={cn('text-xs font-medium', cloudUsage.percentage > 80 ? 'text-red-500' : 'text-muted-foreground')}>
                      {cloudUsage.percentage}%
                    </span>
                  )}
                </div>
                <div className="mt-3">
                  {cloudLoading ? (
                    <div className="h-2 w-full rounded-full bg-muted animate-pulse" />
                  ) : (
                    cloudUsage && <Progress value={cloudUsage.percentage} className="h-2" />
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="hidden grid-cols-2 gap-4 lg:grid xl:grid-cols-4">
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

        <Card>
          <CardContent className="space-y-3 p-6">
            <div className="flex items-center gap-4">
              <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${cloudUsage?.percentage > 80 ? 'bg-red-500/10' : 'bg-purple-500/10'}`}>
                <HardDrive className={`h-6 w-6 ${cloudUsage?.percentage > 80 ? 'text-red-500' : 'text-purple-500'}`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-muted-foreground">Dung lượng Cloudinary</p>
                <p className="text-lg font-semibold text-foreground">
                  {cloudLoading ? (
                    <span className="inline-block h-6 w-24 rounded bg-muted animate-pulse" />
                  ) : (
                    cloudUsage ? cloudUsage.usedFormatted : stats.storageUsed
                  )}
                </p>
              </div>
            </div>
            {cloudLoading ? (
              <div className="space-y-1.5">
                <div className="h-3 w-full rounded bg-muted animate-pulse" />
              </div>
            ) : (
              cloudUsage && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{cloudUsage.usedFormatted} / {cloudUsage.limitFormatted}</span>
                    <span className={cloudUsage.percentage > 80 ? 'font-medium text-red-500' : ''}>{cloudUsage.percentage}%</span>
                  </div>
                  <Progress value={cloudUsage.percentage} className="h-1.5" />
                </div>
              )
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
