'use client'

import { useCallback, useEffect, useState } from 'react'
import { X, Heart, MessageCircle, ChevronLeft, ChevronRight, Columns2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Photo } from '@/lib/types'

interface ComparisonViewerProps {
  photos: Photo[]
  isOpen: boolean
  onClose: () => void
  onSelect: (id: string) => void
  onComment: (id: string) => void
}

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
    if (!isOpen) return
    setLeftIndex(0)
    setRightIndex(Math.min(1, photos.length - 1))
    setActiveSide('left')
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

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black">
      {/* Header - Desktop only */}
      <div className="hidden sm:flex items-center justify-between gap-3 bg-black/80 px-4 py-3 border-b border-white/10 shrink-0">
        <div className="flex min-w-0 items-center gap-3 text-white">
          <Columns2 className="h-5 w-5 text-accent" />
          <span className="font-medium text-lg">So sánh ảnh</span>
          <span className="hidden text-sm text-white/60 sm:inline">
            (Nhấn Tab để chuyển bên, lướt hoặc mũi tên để chuyển ảnh)
          </span>
        </div>

        <button
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
          aria-label="Đóng"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Floating Close Button - Mobile only */}
      <button
        onClick={onClose}
        className="sm:hidden fixed top-4 right-4 z-[70] flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md border border-white/10 active:scale-95 transition-all"
        aria-label="Đóng"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Grid container */}
      <div className="grid flex-1 min-h-0 gap-1 overflow-hidden grid-cols-1 sm:grid-cols-2">
        <PhotoPanel
          photos={photos}
          photo={leftPhoto}
          side="left"
          index={leftIndex}
          total={photos.length}
          isActive={activeSide === 'left'}
          onSelect={onSelect}
          onComment={onComment}
          setActiveSide={setActiveSide}
          navigatePhoto={navigatePhoto}
        />
        <PhotoPanel
          photos={photos}
          photo={rightPhoto}
          side="right"
          index={rightIndex}
          total={photos.length}
          isActive={activeSide === 'right'}
          onSelect={onSelect}
          onComment={onComment}
          setActiveSide={setActiveSide}
          navigatePhoto={navigatePhoto}
        />
      </div>

      {/* Top Logo/Indicator - Mobile only */}
      <div className="sm:hidden fixed top-4 left-4 z-[70] flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md border border-white/10 shadow-lg animate-pulse">
        <Columns2 className="h-5 w-5 text-accent" />
      </div>
    </div>
  )
}

interface PhotoPanelProps {
  photos: Photo[]
  photo: Photo
  side: 'left' | 'right'
  index: number
  total: number
  isActive: boolean
  onSelect: (id: string) => void
  onComment: (id: string) => void
  setActiveSide: (side: 'left' | 'right') => void
  navigatePhoto: (side: 'left' | 'right', direction: 'prev' | 'next') => void
}

function PhotoPanel({
  photos,
  photo,
  side,
  index,
  total,
  isActive,
  onSelect,
  onComment,
  setActiveSide,
  navigatePhoto
}: PhotoPanelProps) {
  const [lastTap, setLastTap] = useState(0)
  const [showHeart, setShowHeart] = useState(false)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchDiff, setTouchDiff] = useState(0)
  const previousPhoto = index > 0 ? photos[index - 1] : null
  const nextPhoto = index < total - 1 ? photos[index + 1] : null
  const boundedTouchDiff =
    (touchDiff > 0 && previousPhoto) || (touchDiff < 0 && nextPhoto)
      ? touchDiff
      : touchDiff * 0.25
  const swipeProgress = Math.min(Math.abs(boundedTouchDiff) / 180, 1)
  const imageTransition = touchStart !== null ? 'none' : 'transform 0.28s cubic-bezier(0.2, 0, 0, 1), opacity 0.28s ease'

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX)
    setTouchDiff(0)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStart === null) return
    const currentX = e.touches[0].clientX
    setTouchDiff(currentX - touchStart)
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    const now = Date.now()
    if (now - lastTap < 300) {
      onSelect(photo.id)
      setShowHeart(true)
      setTimeout(() => setShowHeart(false), 800)
    }
    setLastTap(now)

    if (Math.abs(boundedTouchDiff) > 50) {
      if (touchDiff < 0) navigatePhoto(side, 'next')
      else navigatePhoto(side, 'prev')
    }
    setTouchStart(null)
    setTouchDiff(0)
  }

  const handleDoubleClick = (e: React.MouseEvent) => {
    onSelect(photo.id)
    setShowHeart(true)
    setTimeout(() => setShowHeart(false), 800)
  }

  return (
    <div
      className={cn(
        'relative flex h-full min-h-0 flex-col overflow-hidden bg-black/95 transition-all',
        isActive && 'ring-2 ring-inset ring-accent'
      )}
      onClick={() => setActiveSide(side)}
      onDoubleClick={handleDoubleClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {isActive && (
        <div className="absolute left-1/2 top-3 z-10 -translate-x-1/2 rounded-full bg-accent px-3 py-1 text-xs font-medium text-white shadow-lg backdrop-blur-sm">
          Đang chọn
        </div>
      )}

      {showHeart && (
        <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
          <Heart className="h-24 w-24 fill-accent text-accent animate-ping" />
        </div>
      )}

      {/* Swipe Arrows Indicators */}
      <div 
        className="pointer-events-none absolute left-4 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-md transition-opacity duration-200"
        style={{ opacity: boundedTouchDiff > 20 ? Math.min(boundedTouchDiff / 100, 0.8) : 0 }}
      >
        <ChevronLeft className="h-6 w-6" />
      </div>
      <div 
        className="pointer-events-none absolute right-4 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-md transition-opacity duration-200"
        style={{ opacity: boundedTouchDiff < -20 ? Math.min(Math.abs(boundedTouchDiff) / 100, 0.8) : 0 }}
      >
        <ChevronRight className="h-6 w-6" />
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation()
          navigatePhoto(side, 'prev')
        }}
        disabled={index === 0}
        className={cn(
          'absolute left-4 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-md transition-all hover:bg-black/50 sm:flex hidden',
          index === 0 && 'cursor-not-allowed opacity-0'
        )}
      >
        <ChevronLeft className="h-6 w-6" />
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation()
          navigatePhoto(side, 'next')
        }}
        disabled={index === total - 1}
        className={cn(
          'absolute right-4 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-md transition-all hover:bg-black/50 sm:flex hidden',
          index === total - 1 && 'cursor-not-allowed opacity-0'
        )}
      >
        <ChevronRight className="h-6 w-6" />
      </button>

      <div className="flex flex-1 min-h-0 items-center justify-center p-2 sm:p-4">
        <div className="relative flex h-full max-h-full w-full max-w-full items-center justify-center overflow-hidden">
          {previousPhoto && (
            <img
              src={previousPhoto.src}
              alt={previousPhoto.filename}
              className="pointer-events-none absolute inset-0 z-0 h-full w-full select-none object-contain"
              crossOrigin="anonymous"
              style={{
                opacity: boundedTouchDiff > 0 ? Math.min(0.25 + swipeProgress * 0.75, 1) : 0,
                transform: `translateX(calc(-100% + ${Math.max(boundedTouchDiff, 0)}px)) scale(${0.92 + swipeProgress * 0.08})`,
                transition: imageTransition,
              }}
            />
          )}
          {nextPhoto && (
            <img
              src={nextPhoto.src}
              alt={nextPhoto.filename}
              className="pointer-events-none absolute inset-0 z-0 h-full w-full select-none object-contain"
              crossOrigin="anonymous"
              style={{
                opacity: boundedTouchDiff < 0 ? Math.min(0.25 + swipeProgress * 0.75, 1) : 0,
                transform: `translateX(calc(100% + ${Math.min(boundedTouchDiff, 0)}px)) scale(${0.92 + swipeProgress * 0.08})`,
                transition: imageTransition,
              }}
            />
          )}
          <img
            src={photo.src}
            alt={photo.filename}
            className="pointer-events-none relative z-10 max-h-full max-w-full select-none object-contain"
            crossOrigin="anonymous"
            style={{ 
              opacity: 1 - swipeProgress * 0.08,
              transform: `translateX(${boundedTouchDiff}px) scale(${1 - swipeProgress * 0.04})`,
              transition: imageTransition,
            }}
          />
        </div>
      </div>

      <div className="shrink-0 bg-gradient-to-t from-black/90 to-transparent p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 text-white">
            <p className="truncate font-medium text-lg">{photo.filename}</p>
            <p className="text-sm text-white/50">
              {index + 1} / {total}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onSelect(photo.id)
              }}
              className={cn(
                'flex h-12 w-12 items-center justify-center rounded-full transition-all border border-white/10 active:scale-90',
                photo.selected ? 'bg-accent text-white shadow-[0_0_15px_rgba(var(--accent-rgb),0.4)]' : 'bg-white/10 text-white hover:bg-white/20'
              )}
              aria-label={photo.selected ? 'Bỏ chọn ảnh' : 'Chọn ảnh'}
            >
              <Heart className={cn('h-6 w-6', photo.selected && 'fill-current')} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onComment(photo.id)
              }}
              className={cn(
                'flex h-12 w-12 items-center justify-center rounded-full transition-all border border-white/10 active:scale-90',
                photo.comment ? 'bg-primary text-white shadow-[0_0_15px_rgba(var(--primary-rgb),0.4)]' : 'bg-white/10 text-white hover:bg-white/20'
              )}
              aria-label="Thêm ghi chú"
            >
              <MessageCircle className={cn('h-6 w-6', photo.comment && 'fill-current')} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
