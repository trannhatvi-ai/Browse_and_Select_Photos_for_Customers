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
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [lastTap, setLastTap] = useState(0)
  const [dragOffset, setDragOffset] = useState(0)
  const [touchStart, setTouchStart] = useState<number | null>(null)

  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation()
    setScale(prev => Math.min(prev + 0.5, 3))
  }

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation()
    setScale(prev => {
      const next = Math.max(prev - 0.5, 1)
      if (next === 1) setPosition({ x: 0, y: 0 })
      return next
    })
  }

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft' && currentIndex > 0) onNavigate(currentIndex - 1)
      if (e.key === 'ArrowRight' && currentIndex < photos.length - 1)
        onNavigate(currentIndex + 1)
      if (e.key === '=' || e.key === '+') setScale(prev => Math.min(prev + 0.5, 3))
      if (e.key === '-') {
        setScale(prev => {
          const next = Math.max(prev - 0.5, 1)
          if (next === 1) setPosition({ x: 0, y: 0 })
          return next
        })
      }
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
    setScale(1)
    setPosition({ x: 0, y: 0 })
    setDragOffset(0)
  }, [currentIndex])

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX)
    
    // Double tap to like
    const now = Date.now()
    if (now - lastTap < 300) {
      onSelect(currentPhoto.id)
    }
    setLastTap(now)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStart !== null && scale === 1) {
      const currentX = e.targetTouches[0].clientX
      setDragOffset(currentX - touchStart)
    }
  }

  const handleTouchEnd = () => {
    if (touchStart !== null && scale === 1) {
      if (dragOffset > 80 && currentIndex > 0) {
        onNavigate(currentIndex - 1)
      } else if (dragOffset < -80 && currentIndex < photos.length - 1) {
        onNavigate(currentIndex + 1)
      }
    }
    setTouchStart(null)
    setDragOffset(0)
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true)
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      })
    }
  }

  const handleMouseUp = () => setIsDragging(false)

  const handleWheel = (e: React.WheelEvent) => {
    if (e.deltaY < 0) {
      setScale(prev => Math.min(prev + 0.1, 5))
    } else {
      setScale(prev => {
        const next = Math.max(prev - 0.1, 1)
        if (next === 1) setPosition({ x: 0, y: 0 })
        return next
      })
    }
  }

  if (!isOpen || !currentPhoto) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black overflow-hidden"
      onClick={onClose}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Top bar tools */}
      <div className="absolute top-4 right-4 z-[60] flex items-center gap-2">
        <div className="hidden sm:flex items-center gap-2 mr-4 bg-white/10 rounded-full p-1 backdrop-blur-md">
          <button
            onClick={handleZoomOut}
            className="flex h-8 w-8 items-center justify-center rounded-full text-white hover:bg-white/20 transition-colors"
          >
            <span className="text-xl font-bold">-</span>
          </button>
          <span className="text-[10px] text-white/60 min-w-[3ch] text-center">{Math.round(scale * 100)}%</span>
          <button
            onClick={handleZoomIn}
            className="flex h-8 w-8 items-center justify-center rounded-full text-white hover:bg-white/20 transition-colors"
          >
            <span className="text-xl font-bold">+</span>
          </button>
        </div>
        <button
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Swipe Indicators */}
      {dragOffset > 0 && currentIndex > 0 && (
        <div 
          className="pointer-events-none absolute left-8 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-md transition-opacity"
          style={{ opacity: Math.min(dragOffset / 100, 0.8) }}
        >
          <ChevronLeft className="h-8 w-8" />
        </div>
      )}
      {dragOffset < 0 && currentIndex < photos.length - 1 && (
        <div 
          className="pointer-events-none absolute right-8 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-md transition-opacity"
          style={{ opacity: Math.min(Math.abs(dragOffset) / 100, 0.8) }}
        >
          <ChevronRight className="h-8 w-8" />
        </div>
      )}

      {/* Navigation - Desktop Only */}
      {currentIndex > 0 && dragOffset === 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onNavigate(currentIndex - 1)
          }}
          className="hidden sm:flex absolute left-4 z-10 h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}

      {currentIndex < photos.length - 1 && dragOffset === 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onNavigate(currentIndex + 1)
          }}
          className="hidden sm:flex absolute right-4 z-10 h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      )}

      {/* Image container */}
      <div
        className={cn(
          'relative flex h-full w-full items-center justify-center',
          'touch-manipulation select-none',
          scale > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
        )}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onWheel={handleWheel}
      >
        <img
          src={currentPhoto.src}
          alt={currentPhoto.filename}
          style={{ 
            transform: `translate(${position.x + dragOffset}px, ${position.y}px) scale(${scale})`,
            transition: isDragging || touchStart !== null ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0, 0, 1)'
          }}
          className="max-h-full max-w-full object-contain pointer-events-none will-change-transform"
          crossOrigin="anonymous"
        />
      </div>

      {/* Bottom bar */}
      <div className="absolute bottom-0 inset-x-0 flex items-center justify-between bg-gradient-to-t from-black to-transparent p-4 pt-20 pb-6 pointer-events-none">
        <div className="text-white pointer-events-auto">
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
        <div className="flex items-center gap-2 sm:gap-3 pointer-events-auto">
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
