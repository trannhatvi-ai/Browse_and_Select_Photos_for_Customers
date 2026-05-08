'use client'

import Image from 'next/image'
import { useMemo } from 'react'
import { toast } from 'sonner'
import { Sparkles, Copy, Check, Database, Shapes, Wind, FileText } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useIsMobile } from '@/hooks/use-mobile'

interface PhotoWithContext {
  id: string
  filename: string
  previewUrl: string
  selected?: boolean
  aiContext?: Record<string, unknown> | null
}

interface AIInsightSheetProps {
  photo: PhotoWithContext | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function stringifyValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return 'Chưa có dữ liệu'
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return value.map(item => stringifyValue(item)).join(', ')
  if (typeof value === 'object') return JSON.stringify(value, null, 2)
  return String(value)
}

function FieldBlock({
  label,
  value,
  icon,
}: {
  label: string
  value: unknown
  icon: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border bg-muted/30 p-3 space-y-1.5">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        {icon}
        {label}
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap break-words">
        {stringifyValue(value)}
      </p>
    </div>
  )
}

export function AIInsightSheet({ photo, open, onOpenChange }: AIInsightSheetProps) {
  const isMobile = useIsMobile()
  const context = useMemo(() => {
    if (!photo || !photo.aiContext || typeof photo.aiContext !== 'object') return null
    return photo.aiContext as Record<string, unknown>
  }, [photo])

  const subjects = Array.isArray(context?.subjects) ? context.subjects as Array<Record<string, unknown>> : []
  const tags = Array.isArray(context?.tags) ? context.tags.filter(tag => typeof tag === 'string') as string[] : []
  const lighting = context?.lighting && typeof context.lighting === 'object'
    ? context.lighting as Record<string, unknown>
    : null

  const handleCopy = async () => {
    if (!context) {
      toast.info('Ảnh này chưa có ngữ cảnh Gemini')
      return
    }

    await navigator.clipboard.writeText(JSON.stringify(context, null, 2))
    toast.success('Đã sao chép ngữ cảnh Gemini')
  }

  if (!photo) return null

  // Small mobile sheet: shorter height and swipe-down-to-close support
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isMobile ? 'bottom' : 'right'}
        className={isMobile ? 'h-[70vh] w-full overflow-y-auto rounded-t-3xl px-0' : 'w-full sm:max-w-xl overflow-y-auto px-0'}
      >
        <div
          className={isMobile ? 'px-4 pb-8 pt-2 sm:px-6' : 'px-4 pb-6 sm:px-6'}
          // Enable simple swipe-down-to-close on mobile
          onTouchStart={e => {
            if (!isMobile) return
            ;(e.target as HTMLElement).setAttribute('data-touch-start-y', String(e.touches[0]?.clientY || 0))
          }}
          onTouchEnd={e => {
            if (!isMobile) return
            try {
              const start = Number((e.target as HTMLElement).getAttribute('data-touch-start-y') || 0)
              const end = e.changedTouches[0]?.clientY || 0
              const delta = end - start
              if (delta > 60) onOpenChange(false)
            } catch {
              /* ignore */
            }
          }}
        >
          {/* drag handle so users can see a close affordance */}
          {isMobile ? (
            <div className="flex items-center justify-center">
              <div className="mt-2 mb-3 h-0.5 w-12 rounded-full bg-muted-foreground/40" />
            </div>
          ) : null}
          <SheetHeader className="space-y-2 pb-4">
            <SheetTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-amber-500" />
              Phân tích Gemini
            </SheetTitle>
            <SheetDescription>
              Xem ngữ cảnh AI đã lưu cho ảnh này và sao chép nhanh khi cần.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4">
            <div className="overflow-hidden rounded-2xl border bg-muted">
              <div className="relative aspect-[4/3] w-full">
                <Image
                  src={photo.previewUrl}
                  alt={photo.filename}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="flex items-center justify-between gap-3 border-t bg-background/80 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{photo.filename}</p>
                  <p className="text-xs text-muted-foreground">
                    {context ? 'Đã có dữ liệu Gemini' : 'Chưa có ngữ cảnh Gemini'}
                  </p>
                </div>
                {photo.selected ? (
                  <Badge className="shrink-0 bg-green-500/10 text-green-700 hover:bg-green-500/10">Đã chọn</Badge>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" className="gap-2" onClick={handleCopy}>
                <Copy className="h-4 w-4" />
                Sao chép JSON
              </Button>
              {context ? (
                <Badge variant="secondary" className="gap-1.5 px-3 py-1.5">
                  <Database className="h-3.5 w-3.5" />
                  Gemini context
                </Badge>
              ) : null}
            </div>

            {!context ? (
              <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
                Ảnh này chưa có dữ liệu Gemini. Khi sync xong, ngữ cảnh sẽ xuất hiện ở đây.
              </div>
            ) : (
              <div className="space-y-3">
                <FieldBlock
                  label="Scene"
                  value={context.scene}
                  icon={<Shapes className="h-4 w-4 text-sky-600" />}
                />
                <FieldBlock
                  label="Mood"
                  value={context.mood}
                  icon={<Wind className="h-4 w-4 text-violet-600" />}
                />
                <FieldBlock
                  label="Composition"
                  value={context.composition}
                  icon={<FileText className="h-4 w-4 text-emerald-600" />}
                />
                <FieldBlock
                  label="Colors"
                  value={context.colors}
                  icon={<Sparkles className="h-4 w-4 text-amber-600" />}
                />
                <FieldBlock
                  label="Actions"
                  value={context.actions}
                  icon={<FileText className="h-4 w-4 text-orange-600" />}
                />
                <FieldBlock
                  label="Context"
                  value={context.context}
                  icon={<FileText className="h-4 w-4 text-cyan-600" />}
                />
                <FieldBlock
                  label="Technical notes"
                  value={context.technical_notes}
                  icon={<FileText className="h-4 w-4 text-slate-600" />}
                />

                <div className="rounded-2xl border bg-muted/30 p-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    Lighting
                  </div>
                  {lighting ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      <FieldBlock label="Source" value={lighting.source} icon={<span className="h-2 w-2 rounded-full bg-amber-500" />} />
                      <FieldBlock label="Direction" value={lighting.direction} icon={<span className="h-2 w-2 rounded-full bg-sky-500" />} />
                      <FieldBlock label="Quality" value={lighting.quality} icon={<span className="h-2 w-2 rounded-full bg-emerald-500" />} />
                      <FieldBlock label="Color temperature" value={lighting.color_temperature} icon={<span className="h-2 w-2 rounded-full bg-violet-500" />} />
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Chưa có thông tin lighting chi tiết.</p>
                  )}
                </div>

                <div className="rounded-2xl border bg-muted/30 p-3 space-y-2">
                  <div className="text-sm font-medium text-foreground">Subjects</div>
                  {subjects.length > 0 ? (
                    <div className="space-y-3">
                      {subjects.map((subject, index) => (
                        <div key={`${photo.id}-subject-${index}`} className="rounded-xl border bg-background p-3 text-sm space-y-1.5">
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="outline">{stringifyValue(subject.type)}</Badge>
                            <Badge variant="outline">{stringifyValue(subject.gender)}</Badge>
                            <Badge variant="outline">{stringifyValue(subject.age_group)}</Badge>
                          </div>
                          <p className="text-muted-foreground"><strong>Clothing:</strong> {stringifyValue(subject.clothing)}</p>
                          <p className="text-muted-foreground"><strong>Expression:</strong> {stringifyValue(subject.expression)}</p>
                          <p className="text-muted-foreground"><strong>Pose:</strong> {stringifyValue(subject.pose)}</p>
                          <p className="text-muted-foreground"><strong>Position:</strong> {stringifyValue(subject.position)}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Chưa có subjects.</p>
                  )}
                </div>

                <div className="rounded-2xl border bg-muted/30 p-3 space-y-2">
                  <div className="text-sm font-medium text-foreground">Tags</div>
                  {tags.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {tags.map(tag => (
                        <Badge key={tag} variant="secondary" className="rounded-full px-3 py-1">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Chưa có tags.</p>
                  )}
                </div>

                <Separator />
                <details className="rounded-2xl border bg-muted/20 p-3">
                  <summary className="cursor-pointer text-sm font-medium text-foreground">Xem JSON gốc</summary>
                  <pre className="mt-3 overflow-x-auto rounded-xl bg-background p-3 text-xs leading-relaxed text-muted-foreground">
                    {JSON.stringify(context, null, 2)}
                  </pre>
                </details>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
