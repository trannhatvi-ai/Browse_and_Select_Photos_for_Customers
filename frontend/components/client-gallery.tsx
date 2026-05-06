'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Heart, Camera, ChevronDown, Check, Columns2, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { PhotoCard } from '@/components/photo-card'
import { Lightbox } from '@/components/lightbox'
import { CommentModal } from '@/components/comment-modal'
import { ComparisonViewer } from '@/components/comparison-viewer'
import { cn } from '@/lib/utils'
import type { Photo } from '@/lib/types'
import { mockPhotos } from '@/lib/mock-data'

type FilterType = 'all' | 'selected' | 'unselected'
type SortType = 'date' | 'filename'

export function ClientGallery({ token }: { token?: string }) {
  const router = useRouter()
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(!!token)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [projectData, setProjectData] = useState<any>(null)
  const [filter, setFilter] = useState<FilterType>('all')
  const [sortBy, setSortBy] = useState<SortType>('date')
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [feedbackState, setFeedbackState] = useState<{
    variant: 'success' | 'error'
    title: string
    description: string
  } | null>(null)

  // Lightbox state
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  // Comment modal state
  const [commentModalOpen, setCommentModalOpen] = useState(false)
  const [commentPhoto, setCommentPhoto] = useState<Photo | null>(null)

  // Comparison viewer state
  const [comparisonOpen, setComparisonOpen] = useState(false)

  const maxSelections = projectData?.maxSelections || 15
  const selectedCount = photos.filter((p) => p.selected).length
  const progressPercent = (selectedCount / maxSelections) * 100

  useEffect(() => {
    if (!token) return

    fetch(`/api/gallery/${token}`)
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.error || 'Mã truy cập không hợp lệ')
        }
        return data
      })
      .then((data) => {
        setProjectData(data)
        const formatted = data.photos.map((p: any) => ({
          id: p.id,
          src: p.previewUrl,
          filename: p.filename,
          date: p.uploadedAt,
          selected: p.selected,
          comment: p.comment,
        }))
        setPhotos(formatted)
      })
      .catch((err) => {
        alert(err.message)
        router.push('/')
      })
      .finally(() => setLoading(false))
  }, [token])

  // Filter and sort photos
  const filteredPhotos = useMemo(() => {
    let result = [...photos]

    // Apply filter
    if (filter === 'selected') {
      result = result.filter((p) => p.selected)
    } else if (filter === 'unselected') {
      result = result.filter((p) => !p.selected)
    }

    // Apply sort
    result.sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(a.date).getTime() - new Date(b.date).getTime()
      }
      return a.filename.localeCompare(b.filename)
    })

    return result
  }, [photos, filter, sortBy])

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-40 border-b border-border bg-card/95 p-4">
          <div className="mx-auto max-w-7xl">
            <div className="h-6 w-48 rounded bg-muted animate-pulse" />
          </div>
        </header>

        <div className="mx-auto max-w-7xl px-4 py-6">
          <div className="mb-4">
            <div className="h-8 w-64 rounded bg-muted animate-pulse" />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-[4/3] rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  const handleSelect = (id: string) => {
    setPhotos((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          // Don't allow selecting more than max
          if (!p.selected && selectedCount >= maxSelections) {
            return p
          }
          return { ...p, selected: !p.selected }
        }
        return p
      })
    )
  }

  const handleOpenLightbox = (id: string) => {
    const index = filteredPhotos.findIndex((p) => p.id === id)
    if (index !== -1) {
      setLightboxIndex(index)
      setLightboxOpen(true)
    }
  }

  const handleOpenComment = (id: string) => {
    const photo = photos.find((p) => p.id === id)
    if (photo) {
      setCommentPhoto(photo)
      setCommentModalOpen(true)
    }
  }

  const handleSaveComment = (id: string, comment: string) => {
    setPhotos((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, comment: comment || undefined } : p
      )
    )
  }

  const handleSubmit = async () => {
    if (!token) {
      setFeedbackState({
        variant: 'success',
        title: 'Đã gửi lựa chọn',
        description: `${selectedCount} ảnh đã được chọn. (Mock)`,
      })
      setFeedbackOpen(true)
      return
    }

    setIsSubmitting(true)
    try {
      const selections = photos
        .filter(p => p.selected)
        .map(p => ({ id: p.id, comment: p.comment }))

      const res = await fetch(`/api/gallery/${token}/select`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selections })
      })

      if (!res.ok) throw new Error('Failed to submit')
      setFeedbackState({
        variant: 'success',
        title: 'Đã gửi lựa chọn thành công',
        description: 'Studio đã nhận được danh sách ảnh bạn chọn.',
      })
      setFeedbackOpen(true)
    } catch (err) {
      setFeedbackState({
        variant: 'error',
        title: 'Không thể gửi lựa chọn',
        description: 'Đã xảy ra lỗi khi gửi. Vui lòng thử lại sau.',
      })
      setFeedbackOpen(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <Camera className="h-6 w-6 text-foreground" />
            <span className="text-lg font-semibold text-foreground">Studio Pro</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:block">
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Tiến độ chọn ảnh</span>
                <span className="ml-3 font-medium text-foreground">
                  {selectedCount}/{maxSelections}
                </span>
              </div>
              <Progress value={progressPercent} className="h-2 w-40" />
            </div>
            <span className="text-sm text-muted-foreground">
              Xin chào, <span className="font-medium text-foreground">{projectData?.clientName || 'Khách hàng'}</span>
            </span>
          </div>
        </div>
      </header>

      {/* Filter Bar */}
      <div className="sticky top-16 z-30 border-b border-border/70 bg-card/90 backdrop-blur-xl supports-[backdrop-filter]:bg-card/75 shadow-[0_12px_30px_-24px_rgba(0,0,0,0.45)]">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:px-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:overflow-visible lg:pb-0">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
              aria-pressed={filter === 'all'}
              className={cn(
                'h-9 shrink-0 rounded-full px-4 text-sm font-medium transition-all duration-200',
                filter === 'all'
                  ? 'bg-foreground text-background shadow-md shadow-foreground/15 hover:bg-foreground/90'
                  : 'border-border/80 bg-background/80 text-muted-foreground shadow-sm hover:bg-muted hover:text-foreground'
              )}
            >
              Tất cả ảnh
            </Button>
            <Button
              variant={filter === 'selected' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('selected')}
              aria-pressed={filter === 'selected'}
              className={cn(
                'h-9 shrink-0 rounded-full px-4 text-sm font-medium transition-all duration-200 gap-1.5',
                filter === 'selected'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20 hover:bg-rose-600/90'
                  : 'border-border/80 bg-background/80 text-muted-foreground shadow-sm hover:bg-muted hover:text-foreground'
              )}
            >
              <Heart className={cn('h-3.5 w-3.5 transition-transform', filter === 'selected' && 'fill-current scale-110')} />
              Đã chọn
            </Button>
            <Button
              variant={filter === 'unselected' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('unselected')}
              aria-pressed={filter === 'unselected'}
              className={cn(
                'h-9 shrink-0 rounded-full px-4 text-sm font-medium transition-all duration-200',
                filter === 'unselected'
                  ? 'bg-foreground text-background shadow-md shadow-foreground/15 hover:bg-foreground/90'
                  : 'border-border/80 bg-background/80 text-muted-foreground shadow-sm hover:bg-muted hover:text-foreground'
              )}
            >
              Chưa chọn
            </Button>
          </div>

          <div className="flex items-center gap-2 self-start lg:self-auto">
            {/* Comparison button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setComparisonOpen(true)}
              disabled={filteredPhotos.length < 2}
              className={cn(
                'h-9 shrink-0 rounded-full border-border/80 bg-background/80 px-4 text-sm font-medium shadow-sm transition-all duration-200 gap-1.5 hover:bg-muted hover:text-foreground',
                filteredPhotos.length < 2 && 'opacity-60'
              )}
            >
              <Columns2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">So sánh ảnh</span>
              <span className="inline sm:hidden">So sánh</span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 shrink-0 min-w-[128px] justify-between rounded-full border-border/80 bg-background/80 px-4 text-sm font-medium shadow-sm transition-all duration-200 gap-2 hover:bg-muted hover:text-foreground"
                >
                  <span className="hidden sm:inline">Sắp xếp: {sortBy === 'date' ? 'Ngày' : 'Tên file'}</span>
                  <span className="inline sm:hidden">Sắp xếp</span>
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setSortBy('date')}>
                  <Check className={cn('mr-2 h-4 w-4', sortBy !== 'date' && 'opacity-0')} />
                  Ngày
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('filename')}>
                  <Check className={cn('mr-2 h-4 w-4', sortBy !== 'filename' && 'opacity-0')} />
                  Tên file
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Photo Grid */}
      <main className="mx-auto max-w-7xl px-4 py-6 pb-44 sm:px-6 sm:pb-6 lg:px-8">
        {filteredPhotos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Heart className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <h3 className="text-lg font-medium text-foreground">Không tìm thấy ảnh</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {filter === 'selected'
                ? 'Bạn chưa chọn ảnh nào.'
                : 'Tất cả ảnh đã được chọn.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {filteredPhotos.map((photo) => (
              <PhotoCard
                key={photo.id}
                photo={photo}
                onSelect={handleSelect}
                onComment={handleOpenComment}
                onOpen={handleOpenLightbox}
              />
            ))}
          </div>
        )}
      </main>

      {/* Mobile progress indicator */}
      <div className="fixed bottom-24 left-4 right-4 sm:hidden">
        <div className="rounded-lg bg-card p-3 shadow-lg border border-border">
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Tiến độ chọn ảnh</span>
            <span className="font-medium text-foreground">
              {selectedCount}/{maxSelections}
            </span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>
      </div>

      {/* Footer */}
      <footer className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <p className="text-sm text-muted-foreground">
            {selectedCount} / {maxSelections} ảnh đã chọn
          </p>
          <Button
            onClick={handleSubmit}
            disabled={selectedCount === 0 || isSubmitting}
            className="px-6"
          >
            {isSubmitting ? 'Đang gửi...' : 'Gửi lựa chọn cho Studio'}
          </Button>
        </div>
      </footer>

      {/* Lightbox */}
      <Lightbox
        photos={filteredPhotos}
        currentIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onNavigate={setLightboxIndex}
        onSelect={handleSelect}
        onComment={handleOpenComment}
      />

      {/* Comment Modal */}
      <CommentModal
        photo={commentPhoto}
        isOpen={commentModalOpen}
        onClose={() => setCommentModalOpen(false)}
        onSave={handleSaveComment}
      />

      {/* Comparison Viewer */}
      <ComparisonViewer
        photos={filteredPhotos}
        isOpen={comparisonOpen}
        onClose={() => setComparisonOpen(false)}
        onSelect={handleSelect}
        onComment={handleOpenComment}
      />

      <Dialog
        open={feedbackOpen}
        onOpenChange={(open) => {
          setFeedbackOpen(open)
          if (!open) setFeedbackState(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="space-y-4 text-center sm:text-left">
            <div className={cn(
              'mx-auto flex h-14 w-14 items-center justify-center rounded-full sm:mx-0',
              feedbackState?.variant === 'success' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'
            )}>
              {feedbackState?.variant === 'success' ? (
                <CheckCircle2 className="h-7 w-7" />
              ) : (
                <AlertCircle className="h-7 w-7" />
              )}
            </div>
            <div className="space-y-1">
              <DialogTitle className="text-xl">
                {feedbackState?.title || 'Thông báo'}
              </DialogTitle>
              <DialogDescription className="text-sm leading-6">
                {feedbackState?.description || ''}
              </DialogDescription>
            </div>
          </DialogHeader>
          <DialogFooter>
            <Button
              className="w-full sm:w-auto"
              onClick={() => {
                setFeedbackOpen(false)
                setFeedbackState(null)
              }}
            >
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
