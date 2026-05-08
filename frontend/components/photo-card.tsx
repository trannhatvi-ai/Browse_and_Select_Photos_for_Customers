'use client'

import { useState } from 'react'
import { Heart, MessageCircle, Star, Loader2, FlaskConical } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { Photo } from '@/lib/types'

interface PhotoCardProps {
  photo: Photo
  onSelect: (id: string) => void
  onComment: (id: string) => void
  onOpen: (id: string) => void
  highlighted?: boolean
  aiGroupSize?: number | undefined
  onShowGroup?: (groupId: string | undefined) => void
  projectId?: string
  onIndexed?: () => void
}

export function PhotoCard({ photo, onSelect, onComment, onOpen, highlighted, aiGroupSize, projectId: propProjectId, onIndexed }: PhotoCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [indexing, setIndexing] = useState(false)
  const [indexProgress, setIndexProgress] = useState<number | null>(null)
  highlighted = highlighted ?? false

  const projectId = propProjectId || (photo as any).projectId || (photo as any).project_id

  const handleEmbedClick = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!projectId) {
      toast.error('Thiếu project ID')
      return
    }
    try {
      setIndexing(true)
      setIndexProgress(0)
      const res = await fetch(`/api/projects/${projectId}/photos/${photo.id}/context?embed_face=true`, {
        method: 'POST',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || data.message || `HTTP ${res.status}`)
      }

      // Poll status endpoint until completion or timeout
      const maxPolls = 60 // ~2 minutes
      for (let i = 0; i < maxPolls; i++) {
        await new Promise((r) => setTimeout(r, 2000))
        try {
          const s = await fetch(`/api/tasks/index/${projectId}`)
          if (!s.ok) continue
          const state = await s.json()
          const pct = state.percentage ?? state.progress ?? null
          if (typeof pct === 'number') setIndexProgress(Math.round(pct))
          if ((state.percentage && state.percentage >= 100) || state.status === 'completed') {
            toast.success('Ảnh đã được embed xong')
            setIndexing(false)
            setIndexProgress(null)
            if (typeof onIndexed === 'function') onIndexed()
            return
          }
        } catch (err) {
          // ignore transient errors
        }
      }

      toast.success('Yêu cầu đã được xếp hàng; kiểm tra trạng thái sau')
    } catch (err: any) {
      console.error('Embed error', err)
      toast.error(err?.message || 'Lỗi khi gửi yêu cầu embed')
    } finally {
      setIndexing(false)
      setIndexProgress(null)
    }
  }

  return (
    <div
      className={cn(
        'group relative aspect-[4/3] overflow-hidden rounded-lg bg-muted cursor-pointer transition-all',
        photo.selected && 'ring-2 ring-accent ring-offset-2 ring-offset-background shadow-md',
        highlighted && 'ring-4 ring-indigo-400/40'
      )}
      data-photo-id={photo.id}
      data-ai-group={photo.aiGroupId}
      aria-label={photo.filename}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onOpen(photo.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen(photo.id)
        }
      }}
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
        onLoad={() => setImageLoaded(true)}
        crossOrigin="anonymous"
      />

      {/* Loading skeleton */}
      {!imageLoaded && (
        <div className="absolute inset-0 animate-pulse bg-muted" />
      )}

      {/* Selection indicator - Layer 20 */}
      {photo.selected && (
        <div className="absolute top-3 left-3 z-20 hidden items-center gap-1.5 rounded-full bg-accent px-2.5 py-1 text-[11px] font-semibold text-white shadow-lg sm:flex">
          <Heart className="h-3.5 w-3.5 fill-white text-white" />
          <span>Đã chọn</span>
        </div>
      )}

      {/* AI Best-shot badge */}
      {photo.aiBestShot && (
        <div className="absolute bottom-3 left-3 z-20 flex items-center gap-1.5 rounded-full bg-amber-500 px-2.5 py-1 text-[11px] font-semibold text-white shadow-lg">
          <Star className="h-3.5 w-3.5 text-white" />
          <span>AI Recommended</span>
        </div>
      )}

      {/* Group stack / +N indicator - top-right */}
      {photo.aiGroupSize && photo.aiGroupSize > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            if (typeof onShowGroup === 'function') onShowGroup(photo.aiGroupId)
          }}
          className="absolute top-3 right-3 z-20 flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-semibold text-white shadow-lg"
          aria-label={`Nhóm ${photo.aiGroupSize} ảnh`}
        >
          <span className="text-[11px]">+{photo.aiGroupSize - 1}</span>
        </button>
      )}

      {/* Highlight overlay when result of search */}
      {highlighted && (
        <div className="absolute inset-0 z-40 rounded-lg ring-4 ring-indigo-400/60 pointer-events-none" />
      )}

      {/* Comment indicator - Layer 20 */}
      {photo.comment && (
        <div className="absolute top-3 right-3 flex h-8 w-8 sm:h-6 sm:w-6 items-center justify-center rounded-full bg-primary z-20">
          <MessageCircle className="h-4 w-4 sm:h-3.5 sm:w-3.5 fill-white text-white" />
        </div>
      )}
      
      {/* Search Score Badge */}
      {photo.score !== undefined && (
        <div className="absolute top-3 right-12 z-20 flex items-center gap-1 rounded-full bg-indigo-600/90 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm backdrop-blur-sm">
          <span>{Math.round(photo.score * 100)}%</span>
        </div>
      )}

      {/* Hover actions - Layer 30 (Cao nhất) */}
      <div
        className={cn(
          'absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/90 via-black/40 to-transparent p-3 pt-12 transition-all duration-300 z-30',
          'opacity-100 sm:opacity-0 sm:group-hover:opacity-100'
        )}
      >
        <span className="max-w-[calc(100%-120px)] text-xs font-medium text-white truncate drop-shadow-md sm:max-w-[150px]">
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
