'use client'

import { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { Photo } from '@/lib/types'

interface CommentModalProps {
  photo: Photo | null
  isOpen: boolean
  onClose: () => void
  onSave: (id: string, comment: string) => void
}

export function CommentModal({ photo, isOpen, onClose, onSave }: CommentModalProps) {
  const [comment, setComment] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isOpen && photo) {
      setComment(photo.comment || '')
      setTimeout(() => textareaRef.current?.focus(), 100)
    }
  }, [isOpen, photo])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      window.addEventListener('keydown', handleEscape)
    }
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  if (!isOpen || !photo) return null

  const handleSave = () => {
    onSave(photo.id, comment.trim())
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-lg bg-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-card-foreground">Ghi chú chỉnh sửa</h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Photo preview */}
        <div className="mb-4 flex items-center gap-3">
          <img
            src={photo.src}
            alt={photo.filename}
            className="h-16 w-20 rounded object-cover"
            crossOrigin="anonymous"
          />
          <span className="text-sm text-muted-foreground">{photo.filename}</span>
        </div>

        {/* Comment input */}
        <Textarea
          ref={textareaRef}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Thêm ghi chú chỉnh sửa (ví dụ: xóa vết nám bên trái, làm sáng mắt...)"
          className="mb-4 min-h-[120px] resize-none"
        />

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button onClick={handleSave}>
            {comment.trim() ? 'Lưu ghi chú' : 'Xóa ghi chú'}
          </Button>
        </div>
      </div>
    </div>
  )
}
