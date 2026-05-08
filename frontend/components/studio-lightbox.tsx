'use client'

import { useEffect, useCallback, useState } from 'react'
import { X, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StudioLightboxProps {
  photos: any[]
  currentIndex: number
  isOpen: boolean
  onClose: () => void
  onNavigate: (index: number) => void
  onDelete: (photo: any) => void
}

export function StudioLightbox({
  photos,
  currentIndex,
  isOpen,
  onClose,
  onNavigate,
  onDelete,
}: StudioLightboxProps) {
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

  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > 50
    const isRightSwipe = distance < -50
    
    if (isLeftSwipe && currentIndex < photos.length - 1) {
      onNavigate(currentIndex + 1)
    } else if (isRightSwipe && currentIndex > 0) {
      onNavigate(currentIndex - 1)
    }
  }

  if (!isOpen || !currentPhoto) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95"
      onClick={onClose}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-[110] flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
        aria-label="Đóng"
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
          className="absolute left-4 z-[110] flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
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
          className="absolute right-4 z-[110] flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      )}

      {/* Image container */}
      <div
        className={cn(
          'relative flex max-h-[85vh] max-w-[90vw] items-center justify-center overflow-hidden rounded-lg px-4 py-8',
          'touch-manipulation'
        )}
        onClick={(e) => {
          e.stopPropagation()
          setIsZoomed((value) => !value)
        }}
      >
        <img
          src={currentPhoto.src || currentPhoto.previewUrl || (currentPhoto.originalUrl?.startsWith('http') ? currentPhoto.originalUrl : null) || currentPhoto.url}
          alt={currentPhoto.filename}
          className={cn(
            'max-h-[85vh] max-w-[90vw] object-contain transition-transform duration-300 ease-out will-change-transform',
            isZoomed && 'scale-150 sm:scale-[1.85]'
          )}
        />
      </div>

      <div className="pointer-events-none absolute top-16 left-1/2 z-[110] -translate-x-1/2 rounded-full bg-black/40 px-3 py-1 text-[11px] text-white/80 backdrop-blur-sm">
        {isZoomed ? 'Nhấp để thu nhỏ' : 'Nhấp để phóng to'}
      </div>

      {/* Bottom bar */}
      <div className="absolute bottom-0 inset-x-0 flex items-center justify-between bg-gradient-to-t from-black/80 to-transparent p-6 pt-16 z-[110]">
        <div className="text-white">
          <p className="font-medium text-lg">{currentPhoto.filename}</p>
          <div className="mt-1 flex items-center gap-2 text-sm text-white/60">
            <p>
              {currentIndex + 1} / {photos.length}
            </p>
            {currentPhoto.selected && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-500/20 px-2 py-0.5 text-[11px] font-medium text-green-400">
                Khách đã chọn
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete(currentPhoto)
            }}
            className="flex h-12 items-center gap-2 rounded-full bg-red-600 px-6 text-white shadow-lg transition-all hover:bg-red-700 active:scale-95"
          >
            <Trash2 className="h-5 w-5" />
            <span className="font-medium">Xóa ảnh</span>
          </button>
        </div>
      </div>
    </div>
  )
}
