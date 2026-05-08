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
    // scale(1) removed to keep zoom when navigating as requested
    setDragOffset(0)
  }, [currentIndex])

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX)
    
    // Optional: double tap feedback or action for admin
    const now = Date.now()
    if (now - lastTap < 300) {
      // For studio admin, maybe just visual zoom toggle or do nothing
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
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black overflow-hidden"
      onClick={onClose}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Top tools */}
      <div className="absolute top-4 right-4 z-[110] flex items-center gap-2">
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
          aria-label="Đóng"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Swipe Indicators */}
      {dragOffset > 0 && currentIndex > 0 && (
        <div 
          className="pointer-events-none absolute left-8 z-[120] flex h-16 w-16 items-center justify-center rounded-full bg-white/30 text-white backdrop-blur-md transition-opacity"
          style={{ opacity: Math.min(dragOffset / 60, 0.9) }}
        >
          <ChevronLeft className="h-10 w-10" />
        </div>
      )}
      {dragOffset < 0 && currentIndex < photos.length - 1 && (
        <div 
          className="pointer-events-none absolute right-8 z-[120] flex h-16 w-16 items-center justify-center rounded-full bg-white/30 text-white backdrop-blur-md transition-opacity"
          style={{ opacity: Math.min(Math.abs(dragOffset) / 60, 0.9) }}
        >
          <ChevronRight className="h-10 w-10" />
        </div>
      )}

      {/* Navigation - Desktop Only */}
      {currentIndex > 0 && dragOffset === 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onNavigate(currentIndex - 1)
          }}
          className="hidden sm:flex absolute left-4 z-[110] h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
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
          className="hidden sm:flex absolute right-4 z-[110] h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
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
          src={currentPhoto.src || currentPhoto.previewUrl || (currentPhoto.originalUrl?.startsWith('http') ? currentPhoto.originalUrl : null) || currentPhoto.url}
          alt={currentPhoto.filename}
          style={{ 
            transform: `translate(${position.x + dragOffset}px, ${position.y}px) scale(${scale})`,
            transition: isDragging || touchStart !== null ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0, 0, 1)'
          }}
          className="max-h-full max-w-full object-contain pointer-events-none will-change-transform"
        />
      </div>

      {/* Bottom bar */}
      <div className="absolute bottom-0 inset-x-0 flex items-center justify-between bg-gradient-to-t from-black to-transparent p-6 pt-20 pb-10 z-[110] pointer-events-none">
        <div className="text-white pointer-events-auto">
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
        <div className="flex items-center gap-3 pointer-events-auto">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete(currentPhoto)
            }}
            className="flex h-12 items-center gap-2 rounded-xl bg-white/10 px-6 text-white transition-all hover:bg-red-600 active:scale-95 border border-white/10"
          >
            <Trash2 className="h-4 w-4" />
            <span className="text-xs font-semibold tracking-widest uppercase">Xóa ảnh</span>
          </button>
        </div>
      </div>
    </div>
  )
}
