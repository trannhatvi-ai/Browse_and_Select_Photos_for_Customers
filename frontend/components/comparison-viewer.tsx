'use client'

import { useCallback, useEffect, useState } from 'react'
import { X, Heart, MessageCircle, ChevronLeft, ChevronRight, Columns2, Rows2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Photo } from '@/lib/types'

interface ComparisonViewerProps {
  photos: Photo[]
  isOpen: boolean
  onClose: () => void
  onSelect: (id: string) => void
  onComment: (id: string) => void
}

type LayoutMode = 'side-by-side' | 'stacked'

export function ComparisonViewer({
  photos,
  isOpen,
  onClose,
  onSelect,
  onComment,
}: ComparisonViewerProps) {
  const [leftIndex, setLeftIndex] = useState(0)
  const [rightIndex, setRightIndex] = useState(1)
  const [activeSide, setActiveSide] = useState<'left' | 'right'>('left')
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('stacked')

  const leftPhoto = photos[leftIndex]
  const rightPhoto = photos[rightIndex]

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return

      if (e.key === 'Escape') {
        onClose()
        return
      }

      if (activeSide === 'left') {
        if (e.key === 'ArrowLeft' && leftIndex > 0) setLeftIndex(leftIndex - 1)
        if (e.key === 'ArrowRight' && leftIndex < photos.length - 1) setLeftIndex(leftIndex + 1)
      } else {
        if (e.key === 'ArrowLeft' && rightIndex > 0) setRightIndex(rightIndex - 1)
        if (e.key === 'ArrowRight' && rightIndex < photos.length - 1) setRightIndex(rightIndex + 1)
      }

      if (e.key === 'Tab') {
        e.preventDefault()
        setActiveSide((current) => (current === 'left' ? 'right' : 'left'))
      }
    },
    [activeSide, isOpen, leftIndex, onClose, photos.length, rightIndex]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  useEffect(() => {
    const updateLayoutMode = () => {
      setLayoutMode(window.innerWidth < 640 ? 'stacked' : 'side-by-side')
    }

    updateLayoutMode()
    window.addEventListener('resize', updateLayoutMode)
    return () => window.removeEventListener('resize', updateLayoutMode)
  }, [])

  useEffect(() => {
    if (!isOpen) return
    setLeftIndex(0)
    setRightIndex(Math.min(1, photos.length - 1))
    setActiveSide('left')
    setLayoutMode(window.innerWidth < 640 ? 'stacked' : 'side-by-side')
  }, [isOpen, photos.length])

  if (!isOpen || photos.length < 2) return null

  const navigatePhoto = (side: 'left' | 'right', direction: 'prev' | 'next') => {
    if (side === 'left') {
      if (direction === 'prev' && leftIndex > 0) setLeftIndex(leftIndex - 1)
      if (direction === 'next' && leftIndex < photos.length - 1) setLeftIndex(leftIndex + 1)
    } else {
      if (direction === 'prev' && rightIndex > 0) setRightIndex(rightIndex - 1)
      if (direction === 'next' && rightIndex < photos.length - 1) setRightIndex(rightIndex + 1)
    }
  }

  const renderPhotoPanel = (photo: Photo, side: 'left' | 'right', index: number) => {
    const isActive = activeSide === side

    return (
      <div
        className={cn(
          'relative flex h-full min-h-0 flex-col overflow-hidden bg-black/95 transition-all',
          isActive && 'ring-2 ring-inset ring-accent'
        )}
        onClick={() => setActiveSide(side)}
      >
        {isActive && (
          <div className="absolute left-1/2 top-3 z-10 -translate-x-1/2 rounded-full bg-accent px-3 py-1 text-xs font-medium text-white">
            Đang chọn
          </div>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation()
            navigatePhoto(side, 'prev')
          }}
          disabled={index === 0}
          className={cn(
            'absolute left-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20',
            index === 0 && 'cursor-not-allowed opacity-30'
          )}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation()
            navigatePhoto(side, 'next')
          }}
          disabled={index === photos.length - 1}
          className={cn(
            'absolute right-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20',
            index === photos.length - 1 && 'cursor-not-allowed opacity-30'
          )}
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        <div className="flex flex-1 min-h-0 items-center justify-center p-2 sm:p-4">
          <div className="relative flex h-full max-h-full max-w-full items-center justify-center">
            <img
              src={photo.src}
              alt={photo.filename}
              className={cn('max-w-full object-contain', layoutMode === 'stacked' ? 'max-h-full' : 'max-h-[70vh]')}
              crossOrigin="anonymous"
            />
          </div>
        </div>

        <div className="shrink-0 bg-gradient-to-t from-black/80 to-transparent p-3 sm:p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 text-white">
              <p className="truncate font-medium">{photo.filename}</p>
              <p className="text-sm text-white/60">
                {index + 1} / {photos.length}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onSelect(photo.id)
                }}
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-full transition-colors',
                  photo.selected ? 'bg-accent text-white' : 'bg-white/20 text-white hover:bg-white/30'
                )}
                aria-label={photo.selected ? 'Bỏ chọn ảnh' : 'Chọn ảnh'}
              >
                <Heart className={cn('h-5 w-5', photo.selected && 'fill-current')} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onComment(photo.id)
                }}
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-full transition-colors',
                  photo.comment ? 'bg-primary text-white' : 'bg-white/20 text-white hover:bg-white/30'
                )}
                aria-label="Thêm ghi chú"
              >
                <MessageCircle className={cn('h-5 w-5', photo.comment && 'fill-current')} />
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex items-center justify-between gap-3 bg-black/80 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3 text-white">
          <Columns2 className="h-5 w-5" />
          <span className="font-medium">So sánh ảnh</span>
          <span className="hidden text-sm text-white/60 sm:inline">
            (Nhấn Tab để chuyển bên, mũi tên để chuyển ảnh)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setLayoutMode((current) => (current === 'stacked' ? 'side-by-side' : 'stacked'))}
            className="border-white/15 bg-white/10 text-white hover:bg-white/20 hover:text-white"
          >
            {layoutMode === 'stacked' ? (
              <>
                <Rows2 className="mr-2 h-4 w-4" />
                Trên dưới
              </>
            ) : (
              <>
                <Columns2 className="mr-2 h-4 w-4" />
                2 bên
              </>
            )}
          </Button>

          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className={cn('grid flex-1 min-h-0 gap-1 overflow-hidden', layoutMode === 'stacked' ? 'grid-rows-2' : 'grid-cols-2')}>
        {renderPhotoPanel(leftPhoto, 'left', leftIndex)}
        {renderPhotoPanel(rightPhoto, 'right', rightIndex)}
      </div>
    </div>
  )
}
