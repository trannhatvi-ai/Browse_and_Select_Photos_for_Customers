'use client'

import { useEffect, useCallback } from 'react'
import { X, ChevronLeft, ChevronRight, Heart, MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Photo } from '@/lib/types'

interface LightboxProps {
  photos: Photo[]
  currentIndex: number
  isOpen: boolean
  onClose: () => void
  onNavigate: (index: number) => void
  onSelect: (id: string) => void
  onComment: (id: string) => void
}

export function Lightbox({
  photos,
  currentIndex,
  isOpen,
  onClose,
  onNavigate,
  onSelect,
  onComment,
}: LightboxProps) {
  const currentPhoto = photos[currentIndex]

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft' && currentIndex > 0) onNavigate(currentIndex - 1)
      if (e.key === 'ArrowRight' && currentIndex < photos.length - 1)
        onNavigate(currentIndex + 1)
    },
    [isOpen, currentIndex, photos.length, onClose, onNavigate]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen || !currentPhoto) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
        aria-label="Đóng lightbox"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Navigation - Previous */}
      {currentIndex > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onNavigate(currentIndex - 1)
          }}
          className="absolute left-4 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
          aria-label="Ảnh trước"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}

      {/* Navigation - Next */}
      {currentIndex < photos.length - 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onNavigate(currentIndex + 1)
          }}
          className="absolute right-4 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
          aria-label="Ảnh sau"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      )}

      {/* Image container */}
      <div
        className="relative max-h-[85vh] max-w-[90vw]"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={currentPhoto.src}
          alt={currentPhoto.filename}
          className="max-h-[85vh] max-w-[90vw] object-contain"
          crossOrigin="anonymous"
        />

        {/* Watermark */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span
            className="text-6xl font-bold tracking-widest text-white/15 select-none"
            style={{ transform: 'rotate(-30deg)' }}
          >
            MẪU
          </span>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="absolute bottom-0 inset-x-0 flex items-center justify-between bg-gradient-to-t from-black/80 to-transparent p-4 pt-16">
        <div className="text-white">
          <p className="font-medium">{currentPhoto.filename}</p>
          <p className="text-sm text-white/60">
            {currentIndex + 1} / {photos.length}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onSelect(currentPhoto.id)}
            className={cn(
              'flex h-11 w-11 items-center justify-center rounded-full transition-colors',
              currentPhoto.selected
                ? 'bg-accent text-white'
                : 'bg-white/20 text-white hover:bg-white/30'
            )}
            aria-label={currentPhoto.selected ? 'Bỏ chọn ảnh' : 'Chọn ảnh'}
          >
            <Heart className={cn('h-5 w-5', currentPhoto.selected && 'fill-current')} />
          </button>
          <button
            onClick={() => onComment(currentPhoto.id)}
            className={cn(
              'flex h-11 w-11 items-center justify-center rounded-full transition-colors',
              currentPhoto.comment
                ? 'bg-primary text-white'
                : 'bg-white/20 text-white hover:bg-white/30'
            )}
            aria-label="Thêm ghi chú"
          >
            <MessageCircle className={cn('h-5 w-5', currentPhoto.comment && 'fill-current')} />
          </button>
        </div>
      </div>
    </div>
  )
}
