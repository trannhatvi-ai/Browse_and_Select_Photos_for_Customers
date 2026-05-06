'use client'

import { useState } from 'react'
import { Heart, MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Photo } from '@/lib/types'

interface PhotoCardProps {
  photo: Photo
  onSelect: (id: string) => void
  onComment: (id: string) => void
  onOpen: (id: string) => void
}

export function PhotoCard({ photo, onSelect, onComment, onOpen }: PhotoCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)

  return (
    <div
      className="group relative aspect-[4/3] overflow-hidden rounded-lg bg-muted cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image */}
      <img
        src={photo.src}
        alt={photo.filename}
        className={cn(
          'h-full w-full object-cover transition-all duration-300',
          isHovered && 'scale-105',
          !imageLoaded && 'opacity-0'
        )}
        onClick={() => onOpen(photo.id)}
        onLoad={() => setImageLoaded(true)}
        crossOrigin="anonymous"
      />

      {/* Loading skeleton */}
      {!imageLoaded && (
        <div className="absolute inset-0 animate-pulse bg-muted" />
      )}

      {/* Selection indicator - Layer 20 */}
      {photo.selected && (
        <div className="absolute top-3 left-3 flex h-6 w-6 items-center justify-center rounded-full bg-accent z-20">
          <Heart className="h-3.5 w-3.5 fill-white text-white" />
        </div>
      )}

      {/* Comment indicator - Layer 20 */}
      {photo.comment && (
        <div className="absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded-full bg-primary z-20">
          <MessageCircle className="h-3.5 w-3.5 fill-white text-white" />
        </div>
      )}

      {/* Hover actions - Layer 30 (Cao nhất) */}
      <div
        className={cn(
          'absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/90 via-black/40 to-transparent p-3 pt-12 transition-all duration-300 z-30',
          'opacity-0 group-hover:opacity-100'
        )}
      >
        <span className="text-xs font-medium text-white truncate max-w-[150px] drop-shadow-md">
          {photo.filename}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onSelect(photo.id)
            }}
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-full transition-all active:scale-90',
              photo.selected
                ? 'bg-accent text-white shadow-lg'
                : 'bg-white/20 text-white hover:bg-white/40 backdrop-blur-sm'
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
              'flex h-10 w-10 items-center justify-center rounded-full transition-all active:scale-90',
              photo.comment
                ? 'bg-primary text-white shadow-lg'
                : 'bg-white/20 text-white hover:bg-white/40 backdrop-blur-sm'
            )}
            aria-label="Thêm ghi chú"
          >
            <MessageCircle className={cn('h-5 w-5', photo.comment && 'fill-current')} />
          </button>
        </div>
      </div>
    </div>
  )
}
