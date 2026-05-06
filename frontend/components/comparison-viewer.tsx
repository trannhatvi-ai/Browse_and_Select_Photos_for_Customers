'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Heart, MessageCircle, ChevronLeft, ChevronRight, Columns2 } from 'lucide-react'
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
      if (e.key === 'Escape') onClose()
      
      if (activeSide === 'left') {
        if (e.key === 'ArrowLeft' && leftIndex > 0) setLeftIndex(leftIndex - 1)
        if (e.key === 'ArrowRight' && leftIndex < photos.length - 1) setLeftIndex(leftIndex + 1)
      } else {
        if (e.key === 'ArrowLeft' && rightIndex > 0) setRightIndex(rightIndex - 1)
        if (e.key === 'ArrowRight' && rightIndex < photos.length - 1) setRightIndex(rightIndex + 1)
      }
      
      if (e.key === 'Tab') {
        e.preventDefault()
        setActiveSide(activeSide === 'left' ? 'right' : 'left')
      }
    },
    [isOpen, leftIndex, rightIndex, activeSide, photos.length, onClose]
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

  // Reset indices when opening
  useEffect(() => {
    if (isOpen) {
      setLeftIndex(0)
      setRightIndex(Math.min(1, photos.length - 1))
      setActiveSide('left')
    }
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
          'relative flex-1 flex flex-col bg-black/95 transition-all',
          isActive && 'ring-2 ring-inset ring-accent'
        )}
        onClick={() => setActiveSide(side)}
      >
        {/* Active indicator */}
        {isActive && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 rounded-full bg-accent px-3 py-1 text-xs font-medium text-white">
            Đang chọn
          </div>
        )}

        {/* Navigation buttons */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            navigatePhoto(side, 'prev')
          }}
          disabled={index === 0}
          className={cn(
            'absolute left-2 top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20',
            index === 0 && 'opacity-30 cursor-not-allowed'
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
            'absolute right-2 top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20',
            index === photos.length - 1 && 'opacity-30 cursor-not-allowed'
          )}
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        {/* Image */}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="relative max-h-full max-w-full">
            <img
              src={photo.src}
              alt={photo.filename}
              className="max-h-[70vh] max-w-full object-contain"
              crossOrigin="anonymous"
            />

          </div>
        </div>

        {/* Bottom bar */}
        <div className="bg-gradient-to-t from-black/80 to-transparent p-4">
          <div className="flex items-center justify-between">
            <div className="text-white">
              <p className="font-medium">{photo.filename}</p>
              <p className="text-sm text-white/60">
                {index + 1} / {photos.length}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onSelect(photo.id)
                }}
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-full transition-colors',
                  photo.selected
                    ? 'bg-accent text-white'
                    : 'bg-white/20 text-white hover:bg-white/30'
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
                  photo.comment
                    ? 'bg-primary text-white'
                    : 'bg-white/20 text-white hover:bg-white/30'
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
      {/* Header */}
      <div className="flex items-center justify-between bg-black/80 px-4 py-3">
        <div className="flex items-center gap-3 text-white">
          <Columns2 className="h-5 w-5" />
          <span className="font-medium">So sánh ảnh</span>
          <span className="text-sm text-white/60">
            (Nhấn Tab để chuyển bên, mũi tên để chuyển ảnh)
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

      {/* Comparison panels */}
      <div className="flex flex-1 gap-1">
        {renderPhotoPanel(leftPhoto, 'left', leftIndex)}
        {renderPhotoPanel(rightPhoto, 'right', rightIndex)}
      </div>
    </div>
  )
}
