'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertCircle,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  Columns2,
  Heart,
  Loader2,
  Search,
  Send,
  Sparkles,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { PhotoCard } from '@/components/photo-card'
import { Lightbox } from '@/components/lightbox'
import { CommentModal } from '@/components/comment-modal'
import { ComparisonViewer } from '@/components/comparison-viewer'
import { getCloudinaryThumbnail } from '@/lib/cloudinary'
import { cn } from '@/lib/utils'
import type { Photo } from '@/lib/types'
import { GallerySkeleton } from './skeletons'

type FilterType = 'all' | 'selected' | 'unselected' | 'smart'
type SortType = 'date' | 'filename'

export function ClientGallery({ token }: { token?: string }) {
  const router = useRouter()
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(!!token)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [projectData, setProjectData] = useState<any>(null)
  const [filter, setFilter] = useState<FilterType>('all')
  const [sortBy, setSortBy] = useState<SortType>('date')
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [feedbackState, setFeedbackState] = useState<{
    variant: 'success' | 'error'
    title: string
    description: string
  } | null>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [semanticLoading, setSemanticLoading] = useState(false)
  const [semanticAlert, setSemanticAlert] = useState<{
    variant: 'info' | 'success' | 'warning' | 'error'
    title: string
    description: string
  } | null>(null)
  const [semanticMatchedIds, setSemanticMatchedIds] = useState<Set<string> | null>(null)
  const [semanticScores, setSemanticScores] = useState<Map<string, number>>(new Map())
  const [facePopoverOpen, setFacePopoverOpen] = useState(false)
  const faceFileInputRef = useRef<HTMLInputElement | null>(null)
  const faceCameraInputRef = useRef<HTMLInputElement | null>(null)
  const semanticAlertTimerRef = useRef<number | null>(null)

  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  const [commentModalOpen, setCommentModalOpen] = useState(false)
  const [commentPhoto, setCommentPhoto] = useState<Photo | null>(null)
  const [highlightedPhotoIds, setHighlightedPhotoIds] = useState<Set<string>>(new Set())
  const [comparisonOpen, setComparisonOpen] = useState(false)

  const [isAILoading, setIsAILoading] = useState(false)
  const [isSearchExpanded, setIsSearchExpanded] = useState(false)

  const maxSelections = projectData?.maxSelections || 15
  const selectedCount = photos.filter((p) => p.selected).length
  const progressPercent = (selectedCount / maxSelections) * 100

  const fetchGalleryData = async () => {
    if (!token) return
    setLoading(true)
    try {
      const res = await fetch(`/api/gallery/${token}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Mã truy cập không hợp lệ')
      setProjectData(data)
      const formatted = data.photos.map((p: any) => ({
        id: p.id,
        src: p.previewUrl,
        originalUrl: p.originalUrl,
        filename: p.filename,
        date: p.uploadedAt,
        selected: p.selected,
        comment: p.comment,
        url_hash: p.url_hash,
      }))
      setPhotos(formatted)
    } catch (err: any) {
      alert(err.message)
      router.push('/')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchGalleryData()
  }, [token, router])

  const filteredPhotos = useMemo(() => {
    let result = [...photos]

    if (semanticMatchedIds) {
      result = result.filter((p) => semanticMatchedIds.has(p.id))
    }

    if (filter === 'selected') {
      result = result.filter((p) => p.selected)
    } else if (filter === 'unselected') {
      result = result.filter((p) => !p.selected)
    }

    result.sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(a.date).getTime() - new Date(b.date).getTime()
      }
      return a.filename.localeCompare(b.filename)
    })

    return result
  }, [photos, filter, sortBy, semanticMatchedIds])

  const handleSelect = (id: string) => {
    setPhotos((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          if (!p.selected && selectedCount >= maxSelections) return p
          return { ...p, selected: !p.selected }
        }
        return p
      })
    )
  }

  const handleOpenLightbox = (id: string) => {
    const index = filteredPhotos.findIndex((p) => p.id === id)
    if (index !== -1) {
      setLightboxIndex(index)
      setLightboxOpen(true)
    }
  }

  const handleOpenComment = (id: string) => {
    const photo = photos.find((p) => p.id === id)
    if (photo) {
      setCommentPhoto(photo)
      setCommentModalOpen(true)
    }
  }

  const handleSaveComment = (id: string, comment: string) => {
    setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, comment: comment || undefined } : p)))
  }

  const handleSubmit = async () => {
    if (!token) return
    setIsSubmitting(true)
    try {
      const selections = photos.filter((p) => p.selected).map((p) => ({ id: p.id, comment: p.comment }))
      const res = await fetch(`/api/gallery/${token}/select`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selections }),
      })
      if (!res.ok) throw new Error('Failed to submit')
      setFeedbackState({ variant: 'success', title: 'Thành công', description: 'Đã gửi lựa chọn cho studio.' })
      setFeedbackOpen(true)
    } catch {
      setFeedbackState({ variant: 'error', title: 'Lỗi', description: 'Không thể gửi lựa chọn.' })
      setFeedbackOpen(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  const clearSemanticSearch = () => {
    setSearchQuery('')
    setSemanticMatchedIds(null)
    setHighlightedPhotoIds(new Set())
    setSemanticScores(new Map())
    setSemanticAlert(null)
  }

  const performSemanticSearch = async (query: string) => {
    if (!query || !projectData?.id) return
    try {
      setSemanticLoading(true)
      const res = await fetch('/api/search/semantic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectData.id, query, top_k: 50 }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      console.log('[semantic search] qdrant response', data)
      const getFileId = (url: string) => url ? url.split('/').pop()?.split('.')[0] || '' : ''
      const returnedScoreMap = new Map(data.results?.map((r: any) => [getFileId(r.image_url || r.metadata?.original_url), r.score]) || [])
      const matchedIds = photos.filter(p => returnedScoreMap.has(getFileId(p.originalUrl)) || returnedScoreMap.has(getFileId(p.src))).map(p => p.id)
      const matches = new Set<string>(matchedIds)
      
      const scores = new Map<string, number>()
      photos.forEach(p => {
        const score = returnedScoreMap.get(getFileId(p.originalUrl)) || returnedScoreMap.get(getFileId(p.src))
        if (score !== undefined) scores.set(p.id, score)
      })

      setSemanticMatchedIds(matches)
      setHighlightedPhotoIds(matches)
      setSemanticScores(scores)
      
      if (matches.size === 0) {
        setSemanticAlert({ variant: 'error', title: 'Lỗi', description: 'Không tìm thấy kết quả phù hợp.' })
        if (semanticAlertTimerRef.current) window.clearTimeout(semanticAlertTimerRef.current)
        semanticAlertTimerRef.current = window.setTimeout(() => setSemanticAlert(null), 3000)
      } else {
        setSemanticAlert(null)
      }
    } catch {
      setSemanticAlert({ variant: 'error', title: 'Lỗi', description: 'Không tìm thấy kết quả.' })
    } finally {
      setSemanticLoading(false)
    }
  }

  const handleFaceFile = async (file: File) => {
    if (!projectData?.id) return
    setIsAILoading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('project_id', projectData.id)
      const res = await fetch('/api/search/face', { method: 'POST', body: formData })
      if (!res.ok) throw new Error()
      const data = await res.json()
      const getFileId = (url: string) => url ? url.split('/').pop()?.split('.')[0] || '' : ''
      const returnedScoreMap = new Map(data.results?.map((r: any) => [getFileId(r.image_url || r.metadata?.original_url), r.score || 1]) || [])
      const matchedIds = photos.filter(p => returnedScoreMap.has(getFileId(p.originalUrl)) || returnedScoreMap.has(getFileId(p.src))).map(p => p.id)
      const matches = new Set<string>(matchedIds)
      
      const scores = new Map<string, number>()
      photos.forEach(p => {
        const score = returnedScoreMap.get(getFileId(p.originalUrl)) || returnedScoreMap.get(getFileId(p.src))
        if (score !== undefined) scores.set(p.id, score)
      })

      setSemanticMatchedIds(matches)
      setHighlightedPhotoIds(matches)
      setSemanticScores(scores)
    } catch {
      alert('Lỗi tìm kiếm khuôn mặt')
    } finally {
      setIsAILoading(false)
      setFacePopoverOpen(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur py-3 px-4">
        <div className="mx-auto max-w-7xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <Camera className="h-6 w-6" />
            <span className="text-lg font-bold">Studio Pro</span>
          </div>

          <div className="flex-1 flex justify-end items-center gap-2">
            {/* Mobile Search Toggle */}
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-10 w-10 sm:hidden rounded-full p-0 text-sky-500 shadow-[0_0_15px_rgba(14,165,233,0.3)] ring-1 ring-sky-500/20 animate-pulse",
                isSearchExpanded && "hidden"
              )}
              onClick={() => setIsSearchExpanded(true)}
            >
              <Search className="h-5 w-5" />
            </Button>

            <div className={cn(
              "flex-1 max-w-2xl relative group transition-all duration-300",
              !isSearchExpanded && "hidden sm:block"
            )}>
              <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-sky-500/40 via-indigo-500/40 opacity-100 blur-sm animate-pulse" />
              <Input
                autoFocus={isSearchExpanded}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  if (!e.target.value.trim()) clearSemanticSearch()
                }}
                onBlur={() => !searchQuery && setIsSearchExpanded(false)}
                placeholder="Tìm ảnh bằng AI..."
                disabled={semanticLoading}
                className={cn(
                  "relative h-10 w-full rounded-xl pl-10 bg-background border-2 border-sky-500/50 focus-visible:ring-2 focus-visible:ring-sky-500",
                  semanticLoading && "opacity-70 cursor-not-allowed"
                )}
                onKeyDown={(e) => e.key === 'Enter' && !semanticLoading && performSemanticSearch(searchQuery.trim())}
              />
              {semanticLoading ? (
                <Loader2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-sky-500 animate-spin" />
              ) : (
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-sky-500" />
              )}
              {searchQuery && !semanticLoading && (
                <button 
                  onClick={() => { clearSemanticSearch(); setIsSearchExpanded(false); }} 
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded-full transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <div className="hidden sm:block text-right shrink-0">
            <div className="text-sm font-bold">{projectData?.clientName || 'Khách hàng'}</div>
          </div>
        </div>
      </header>

      {semanticAlert && (
        <div className="fixed left-1/2 top-20 z-50 -translate-x-1/2 px-4 w-full max-w-md">
          <div className="bg-card border-2 border-sky-500/30 rounded-2xl p-3 shadow-xl backdrop-blur-md text-sm font-medium">
            {semanticAlert.description}
          </div>
        </div>
      )}

      <div className="sticky top-16 z-30 border-b bg-card/80 backdrop-blur-xl py-2 px-4">
        <div className="mx-auto max-w-7xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <Button variant={filter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('all')} className="h-8 rounded-full px-3 text-xs sm:text-sm sm:px-4">
              Tất cả
            </Button>
            <Button variant={filter === 'selected' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('selected')} className="h-8 rounded-full px-3 text-xs sm:text-sm sm:px-4 gap-1.5">
              <Heart className={cn('h-3.5 w-3.5', filter === 'selected' && 'fill-current')} />
              <span className="hidden sm:inline">Đã chọn</span>
              <span className="sm:hidden">{selectedCount}</span>
            </Button>
            <Button variant={filter === 'unselected' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('unselected')} className="h-8 rounded-full px-3 text-xs sm:text-sm sm:px-4">
              <span className="hidden sm:inline">Chưa chọn</span>
              <span className="sm:hidden">Chưa</span>
            </Button>
          </div>
          
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Popover open={facePopoverOpen} onOpenChange={setFacePopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 w-8 sm:h-9 sm:w-auto rounded-full p-0 sm:px-4 sm:gap-2 border-amber-500/30 bg-amber-500/5 text-amber-700">
                  <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Lọc khuôn mặt</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72">
                <div className="grid gap-3 p-1">
                  <p className="text-sm font-bold">Tìm ảnh theo khuôn mặt</p>
                  <input ref={faceFileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFaceFile(e.target.files[0])} />
                  <input ref={faceCameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && handleFaceFile(e.target.files[0])} />
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" size="sm" onClick={() => faceFileInputRef.current?.click()}>Tải ảnh</Button>
                    <Button variant="outline" size="sm" onClick={() => faceCameraInputRef.current?.click()}><Camera className="mr-1 h-4 w-4" /> Chụp ảnh</Button>
                  </div>
                  {isAILoading && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> Đang quét...</div>}
                </div>
              </PopoverContent>
            </Popover>
            <Button variant="outline" size="sm" onClick={() => setComparisonOpen(true)} className="h-8 w-8 sm:h-9 sm:w-auto rounded-full p-0 sm:px-4 sm:gap-2">
              <Columns2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">So sánh</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 w-8 sm:h-9 sm:w-auto rounded-full p-0 sm:px-4 sm:gap-2">
                  <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Sắp xếp</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setSortBy('date')}>Ngày</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('filename')}>Tên file</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-6 pb-44 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filteredPhotos.map((photo) => (
            <PhotoCard key={photo.id} photo={{...photo, score: semanticScores.get(photo.id)}} highlighted={highlightedPhotoIds.has(photo.id)} onSelect={handleSelect} onComment={handleOpenComment} onOpen={handleOpenLightbox} />
          ))}
        </div>
      </main>

      <footer className="fixed bottom-0 inset-x-0 z-40 border-t bg-card/95 backdrop-blur p-4">
        <div className="mx-auto max-w-7xl flex items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex justify-between text-xs font-bold mb-1">
              <span className="text-muted-foreground">Tiến độ</span>
              <span>{selectedCount} / {maxSelections}</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
          <Button onClick={handleSubmit} disabled={selectedCount === 0 || isSubmitting} className="h-12 px-8 rounded-xl font-bold">
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 mr-2" />} GỬI CHO STUDIO
          </Button>
        </div>
      </footer>

      <Lightbox photos={filteredPhotos} currentIndex={lightboxIndex} isOpen={lightboxOpen} onClose={() => setLightboxOpen(false)} onNavigate={setLightboxIndex} onSelect={handleSelect} onComment={handleOpenComment} />
      <CommentModal photo={commentPhoto} isOpen={commentModalOpen} onClose={() => setCommentModalOpen(false)} onSave={handleSaveComment} />
      <ComparisonViewer photos={filteredPhotos} isOpen={comparisonOpen} onClose={() => setComparisonOpen(false)} onSelect={handleSelect} onComment={handleOpenComment} />
      <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
        <DialogContent><DialogHeader><DialogTitle>{feedbackState?.title}</DialogTitle><DialogDescription>{feedbackState?.description}</DialogDescription></DialogHeader>
        <DialogFooter><Button onClick={() => setFeedbackOpen(false)}>Đóng</Button></DialogFooter></DialogContent>
      </Dialog>
    </div>
  )
}
