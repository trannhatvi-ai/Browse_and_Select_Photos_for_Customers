'use client'

import { useState, useMemo } from 'react'
import { Heart, Camera, ChevronDown, Check, Columns2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
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

export function ClientGallery() {
  const [photos, setPhotos] = useState<Photo[]>(mockPhotos)
  const [filter, setFilter] = useState<FilterType>('all')
  const [sortBy, setSortBy] = useState<SortType>('date')

  // Lightbox state
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  // Comment modal state
  const [commentModalOpen, setCommentModalOpen] = useState(false)
  const [commentPhoto, setCommentPhoto] = useState<Photo | null>(null)

  // Comparison viewer state
  const [comparisonOpen, setComparisonOpen] = useState(false)

  const maxSelections = 15
  const selectedCount = photos.filter((p) => p.selected).length
  const progressPercent = (selectedCount / maxSelections) * 100

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

  const handleSubmit = () => {
    alert(`Đã gửi lựa chọn! ${selectedCount} ảnh đã được chọn.`)
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
              Xin chào, <span className="font-medium text-foreground">Nguyễn Văn A</span>
            </span>
          </div>
        </div>
      </header>

      {/* Filter Bar */}
      <div className="sticky top-16 z-30 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              Tất cả ảnh
            </Button>
            <Button
              variant={filter === 'selected' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('selected')}
              className="gap-1.5"
            >
              <Heart className={cn('h-3.5 w-3.5', filter === 'selected' && 'fill-current')} />
              Đã chọn
            </Button>
            <Button
              variant={filter === 'unselected' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('unselected')}
            >
              Chưa chọn
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {/* Comparison button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setComparisonOpen(true)}
              disabled={filteredPhotos.length < 2}
              className="gap-1.5"
            >
              <Columns2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">So sánh ảnh</span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  Sắp xếp: {sortBy === 'date' ? 'Ngày' : 'Tên file'}
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
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
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
      <div className="fixed bottom-20 left-4 right-4 sm:hidden">
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
            disabled={selectedCount === 0}
            className="px-6"
          >
            Gửi lựa chọn cho Studio
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
    </div>
  )
}
