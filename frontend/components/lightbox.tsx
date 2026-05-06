'use client'

import { useEffect, useCallback, useState } from 'react'
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
  const [isZoomed, setIsZoomed] = useState(false)

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

  useEffect(() => {
    setIsZoomed(false)
  }, [currentIndex])

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
        className={cn(
          'relative flex max-h-[85vh] max-w-[90vw] items-center justify-center overflow-hidden rounded-2xl px-4 py-8',
          'touch-manipulation'
        )}
        onClick={(e) => {
          e.stopPropagation()
          setIsZoomed((value) => !value)
        }}
      >
        <img
          src={currentPhoto.src}
          alt={currentPhoto.filename}
          className={cn(
            'max-h-[85vh] max-w-[90vw] object-contain transition-transform duration-300 ease-out will-change-transform',
            isZoomed && 'scale-150 sm:scale-[1.85]'
          )}
          crossOrigin="anonymous"
        />
      </div>

      <div className="pointer-events-none absolute top-16 left-1/2 z-10 -translate-x-1/2 rounded-full bg-black/40 px-3 py-1 text-[11px] text-white/80 backdrop-blur-sm">
        {isZoomed ? 'Chạm ảnh để thu nhỏ' : 'Chạm ảnh để phóng to'}
      </div>

      {/* Bottom bar */}
      <div className="absolute bottom-0 inset-x-0 flex items-center justify-between bg-gradient-to-t from-black/80 to-transparent p-4 pt-16">
        <div className="text-white">
          <p className="font-medium">{currentPhoto.filename}</p>
          <div className="mt-1 flex items-center gap-2 text-sm text-white/60">
            <p>
              {currentIndex + 1} / {photos.length}
            </p>
            {currentPhoto.selected && (
              <span className="inline-flex items-center gap-1 rounded-full bg-accent/20 px-2 py-0.5 text-[11px] font-medium text-white">
                <Heart className="h-3 w-3 fill-current" />
                Đã chọn
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onSelect(currentPhoto.id)
            }}
            className={cn(
              'flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/15 shadow-lg backdrop-blur-md transition-all duration-200 active:scale-90 sm:h-11 sm:w-11',
              currentPhoto.selected
                ? 'bg-accent text-white shadow-accent/25'
                : 'text-white hover:bg-white/25 hover:shadow-xl'
            )}
            aria-label={currentPhoto.selected ? 'Bỏ chọn ảnh' : 'Chọn ảnh'}
          >
            <Heart className={cn('h-5 w-5 transition-transform duration-200', currentPhoto.selected && 'fill-current scale-110')} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onComment(currentPhoto.id)
            }}
            className={cn(
              'flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/15 shadow-lg backdrop-blur-md transition-all duration-200 active:scale-90 sm:h-11 sm:w-11',
              currentPhoto.comment
                ? 'bg-primary text-white shadow-primary/25'
                : 'text-white hover:bg-white/25 hover:shadow-xl'
            )}
            aria-label="Thêm ghi chú"
          >
            <MessageCircle className={cn('h-5 w-5 transition-transform duration-200', currentPhoto.comment && 'fill-current scale-110')} />
          </button>
        </div>
      </div>
    </div>
  )
}
