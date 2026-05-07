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
  const [semanticStatus, setSemanticStatus] = useState<string | null>(null)
  const [semanticAlert, setSemanticAlert] = useState<{
    variant: 'info' | 'success' | 'warning' | 'error'
    title: string
    description: string
  } | null>(null)
  const [semanticMatchedIds, setSemanticMatchedIds] = useState<Set<string> | null>(null)
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

  const maxSelections = projectData?.maxSelections || 15
  const selectedCount = photos.filter((p) => p.selected).length
  const progressPercent = (selectedCount / maxSelections) * 100

  useEffect(() => {
    if (!token) return

    fetch(`/api/gallery/${token}`)
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.error || 'Mã truy cập không hợp lệ')
        }
        return data
      })
      .then((data) => {
        setProjectData(data)
        const formatted = data.photos.map((p: any) => ({
          id: p.id,
          src: p.previewUrl,
          filename: p.filename,
          date: p.uploadedAt,
          selected: p.selected,
          comment: p.comment,
        }))
        setPhotos(formatted)
      })
      .catch((err) => {
        alert(err.message)
        router.push('/')
      })
      .finally(() => setLoading(false))
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
    } else if (filter === 'smart') {
      result = result.filter((p) => Boolean((p as any).aiGroupId || (p as any).aiBestShot))
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
          if (!p.selected && selectedCount >= maxSelections) {
            return p
          }
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
    if (!token) {
      setFeedbackState({
        variant: 'success',
        title: 'Đã gửi lựa chọn',
        description: `${selectedCount} ảnh đã được chọn. (Mock)`,
      })
      setFeedbackOpen(true)
      return
    }

    setIsSubmitting(true)
    try {
      const selections = photos.filter((p) => p.selected).map((p) => ({ id: p.id, comment: p.comment }))
      const res = await fetch(`/api/gallery/${token}/select`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selections }),
        cache: 'no-store',
        next: { revalidate: 0 }
      })

      if (!res.ok) throw new Error('Failed to submit')
      setFeedbackState({
        variant: 'success',
        title: 'Đã gửi lựa chọn thành công',
        description: 'Studio đã nhận được danh sách ảnh bạn chọn.',
      })
      setFeedbackOpen(true)
    } catch {
      setFeedbackState({
        variant: 'error',
        title: 'Không thể gửi lựa chọn',
        description: 'Đã xảy ra lỗi khi gửi. Vui lòng thử lại sau.',
      })
      setFeedbackOpen(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  const normalizeCloudinaryUrl = (url: string) => {
    if (!url) return url
    try {
      return getCloudinaryThumbnail(url, 800).split('?')[0]
    } catch {
      return url.split('?')[0]
    }
  }

  const performSemanticSearch = async (query: string) => {
    const projectId = projectData?.id
    if (!projectId) {
      console.error('Semantic Search: Missing project UUID. projectData:', projectData)
      return
    }

    console.log(`Semantic Search: Starting for query "${query}" on project ${projectId}`)

    if (semanticAlertTimerRef.current) {
      window.clearTimeout(semanticAlertTimerRef.current)
      semanticAlertTimerRef.current = null
    }

    try {
      setSemanticLoading(true)
      setSemanticStatus(`Đang tìm ảnh theo mô tả: "${query}"...`)
      setSemanticAlert({
        variant: 'info',
        title: 'Đang tìm ảnh',
        description: `Đang tìm ảnh theo mô tả: "${query}"...`,
      })
      setSemanticMatchedIds(null)
      setHighlightedPhotoIds(new Set())
      const res = await fetch('/api/search/semantic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId, query, top_k: 50 }),
        cache: 'no-store',
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || `HTTP error! status: ${res.status}`)
      }

      const data = await res.json()
      console.log('Semantic Search: Received results from backend:', data)

      const extractPublicId = (url: string) => {
        if (!url) return ''
        try {
          const parts = url.split('/')
          const uploadIndex = parts.indexOf('upload')
          if (uploadIndex !== -1 && parts.length > uploadIndex + 2) {
            const idWithExtension = parts.slice(uploadIndex + 2).join('/')
            return idWithExtension.split('.')[0]
          }
          return url.split('/').pop()?.split('.')[0] || url
        } catch (e) {
          return url
        }
      }

      const idMap: Record<string, string> = {}
      for (const p of photos) {
        const publicId = extractPublicId(p.src)
        if (publicId) idMap[publicId] = p.id
        idMap[p.filename] = p.id
      }

      const matches = new Set<string>()
      for (const r of data.results || []) {
        const resultUrl = r.image_url || r.imageUrl || ''
        const resultPublicId = extractPublicId(resultUrl)
        
        let matchedId = idMap[resultPublicId]
        if (!matchedId) {
          const filename = resultUrl.split('/').pop()?.split('.')[0] || ''
          matchedId = idMap[filename]
        }
        
        if (matchedId) {
          matches.add(matchedId)
        }
      }

      console.log(`Semantic Search: Mapped ${matches.size} matches from ${data.results?.length || 0} backend results using PublicID`)
      setSemanticMatchedIds(matches)
      setHighlightedPhotoIds(matches)
      setSemanticStatus(
        matches.size > 0
          ? `Tìm thấy ${matches.size} ảnh phù hợp cho "${query}"`
          : `Không tìm thấy ảnh phù hợp cho "${query}"`
      )
      setSemanticAlert({
        variant: matches.size > 0 ? 'success' : 'warning',
        title: matches.size > 0 ? 'Đã tìm xong' : 'Không có kết quả',
        description:
          matches.size > 0
            ? `Tìm thấy ${matches.size} ảnh phù hợp cho "${query}".`
            : `Không tìm thấy ảnh phù hợp cho "${query}".`,
      })

      semanticAlertTimerRef.current = window.setTimeout(() => {
        setSemanticAlert(null)
      }, 4500)

      const first = matches.values().next().value
      if (first) {
        setTimeout(() => {
          const el = document.querySelector(`[data-photo-id="${first}"]`)
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }, 200)
      }
    } catch (err: any) {
      console.error('Semantic Search Error:', err)
      // Only reset to null if we want to show all photos on FATAL error
      // But if it's just no results, we should keep the empty Set
      setSemanticMatchedIds(null)
      setSemanticStatus(`Lỗi tìm kiếm: ${err.message || 'Không rõ nguyên nhân'}`)
      setSemanticAlert({
        variant: 'error',
        title: 'Tìm theo mô tả thất bại',
        description: 'Không thể tìm ảnh lúc này. Vui lòng thử lại sau.',
      })
      semanticAlertTimerRef.current = window.setTimeout(() => {
        setSemanticAlert(null)
      }, 5000)
      setFeedbackState({ variant: 'error', title: 'Tìm theo mô tả', description: 'Không thể tìm ảnh lúc này' })
      setFeedbackOpen(true)
    } finally {
      setSemanticLoading(false)
    }
  }

  const clearSemanticSearch = () => {
    setSearchQuery('')
    setSemanticMatchedIds(null)
    setHighlightedPhotoIds(new Set())
    setSemanticAlert(null)
  }

  const openFacePicker = (mode: 'file' | 'camera' = 'file') => {
    const input = mode === 'camera' ? faceCameraInputRef.current : faceFileInputRef.current
    input?.click()
  }

  const handleFaceFile = async (file: File) => {
    try {
      setIsAILoading(true)
      const projectId = projectData?.id || token
      if (!projectId) throw new Error('Thiếu mã show chụp')

      const formData = new FormData()
      formData.append('file', file)

      const uploadRes = await fetch(`/api/projects/${projectId}/face-upload`, {
        method: 'POST',
        body: formData,
      })
      const uploadData = await uploadRes.json()
      if (!uploadRes.ok) {
        throw new Error(uploadData.error || uploadData.message || 'Cloudinary upload failed')
      }

      const imageUrl = uploadData.secure_url || uploadData.url || ''
      if (!imageUrl) throw new Error('Upload failed')

      const res = await fetch('/api/search/face', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId, image_url: imageUrl }),
      })
      const data = await res.json()

      const urlToId: Record<string, string> = {}
      for (const p of photos) {
        urlToId[normalizeCloudinaryUrl(p.src)] = p.id
        urlToId[p.src.split('?')[0]] = p.id
        urlToId[p.filename] = p.id
      }

      const matches = new Set<string>()
      for (const r of data.results || []) {
        const key = normalizeCloudinaryUrl(r.image_url || r.imageUrl || '')
        const id = urlToId[key] || Object.keys(urlToId).find((k) => k.endsWith(r.image_url?.split('/').pop() || ''))
        if (id) matches.add(urlToId[id] || id)
      }

      setHighlightedPhotoIds(matches)
      setFeedbackState({ variant: 'success', title: 'Đã quét', description: `${matches.size || 0} kết quả` })
      setFeedbackOpen(true)
    } catch (err: any) {
      console.error(err)
      setFeedbackState({ variant: 'error', title: 'Lỗi quét', description: err?.message || 'Không thể quét ảnh' })
      setFeedbackOpen(true)
    } finally {
      setIsAILoading(false)
      setFacePopoverOpen(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-40 border-b border-border bg-card/95 p-4">
          <div className="mx-auto max-w-7xl">
            <div className="h-6 w-48 rounded bg-muted animate-pulse" />
          </div>
        </header>
        <div className="mx-auto max-w-7xl px-4 py-6">
          <div className="mb-4">
            <div className="h-8 w-64 rounded bg-muted animate-pulse" />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-[4/3] rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="flex items-center justify-between gap-3 sm:justify-start">
              <div className="flex items-center gap-2">
                <Camera className="h-6 w-6 text-foreground" />
                <span className="text-lg font-semibold text-foreground">Studio Pro</span>
              </div>
              <span className="text-sm text-muted-foreground sm:hidden">
                {selectedCount}/{maxSelections}
              </span>
            </div>

            <div className="relative w-full sm:max-w-md sm:flex-1">
              <Input
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  if (!e.target.value.trim()) {
                    setSemanticMatchedIds(null)
                    setHighlightedPhotoIds(new Set())
                  }
                }}
                placeholder="Tìm theo mô tả hoặc từ khóa"
                className="w-full rounded-full pl-10 pr-10"
                onKeyDown={async (e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    const query = searchQuery.trim()
                    if (!query) {
                      clearSemanticSearch()
                      return
                    }
                    if (semanticLoading) return
                    await performSemanticSearch(query)
                  }
                }}
              />
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              {searchQuery && (
                <button
                  onClick={clearSemanticSearch}
                  className="absolute right-10 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              {semanticLoading && (
                <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
              )}
            </div>

            <div className="hidden items-center gap-4 sm:flex">
              <div>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Tiến độ chọn ảnh</span>
                  <span className="ml-3 font-medium text-foreground">{selectedCount}/{maxSelections}</span>
                </div>
                <Progress value={progressPercent} className="h-2 w-40" />
              </div>
              <span className="text-sm text-muted-foreground">
                Xin chào, <span className="font-medium text-foreground">{projectData?.clientName || 'Khách hàng'}</span>
              </span>
            </div>
          </div>
        </div>
      </header>

      {semanticAlert && (
        <div className="fixed left-1/2 top-[4.25rem] z-50 w-[calc(100%-1.5rem)] max-w-2xl -translate-x-1/2 px-2 sm:top-[4.75rem] sm:w-[calc(100%-2.5rem)] sm:px-0">
          <div
            className={cn(
              'pointer-events-auto flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-lg backdrop-blur-md transition-all duration-300 ease-out',
              semanticAlert.variant === 'success' && 'border-emerald-500/25 bg-emerald-500/10 text-emerald-950 dark:text-emerald-50',
              semanticAlert.variant === 'warning' && 'border-amber-500/30 bg-amber-500/10 text-amber-950 dark:text-amber-50',
              semanticAlert.variant === 'error' && 'border-red-500/25 bg-red-500/10 text-red-950 dark:text-red-50',
              semanticAlert.variant === 'info' && 'border-border/60 bg-card/95 text-foreground'
            )}
            role="status"
            aria-live="polite"
          >
            <div
              className={cn(
                'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                semanticAlert.variant === 'success' && 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-200',
                semanticAlert.variant === 'warning' && 'bg-amber-500/15 text-amber-700 dark:text-amber-200',
                semanticAlert.variant === 'error' && 'bg-red-500/15 text-red-700 dark:text-red-200',
                semanticAlert.variant === 'info' && 'bg-muted text-muted-foreground'
              )}
            >
              {semanticAlert.variant === 'success' ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : semanticAlert.variant === 'warning' ? (
                <AlertCircle className="h-5 w-5" />
              ) : semanticAlert.variant === 'error' ? (
                <AlertCircle className="h-5 w-5" />
              ) : (
                <Loader2 className="h-5 w-5 animate-spin" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold">{semanticAlert.title}</div>
              <div className="mt-0.5 text-sm leading-5 opacity-90">{semanticAlert.description}</div>
            </div>
          </div>
        </div>
      )}

      <div className="sticky top-16 z-30 border-b border-border/60 bg-card/80 backdrop-blur-xl supports-[backdrop-filter]:bg-card/70">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:px-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:overflow-visible lg:pb-0">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
              aria-pressed={filter === 'all'}
              className={cn(
                'h-9 shrink-0 rounded-full px-4 text-sm font-medium transition-all duration-200 border',
                filter === 'all'
                  ? 'border-foreground bg-foreground text-background hover:bg-foreground/90'
                  : 'border-border/60 bg-transparent text-muted-foreground hover:border-border hover:bg-muted/40 hover:text-foreground'
              )}
            >
              Tất cả ảnh
            </Button>
            <Button
              variant={filter === 'selected' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('selected')}
              aria-pressed={filter === 'selected'}
              className={cn(
                'h-9 shrink-0 rounded-full px-4 text-sm font-medium transition-all duration-200 gap-1.5 border',
                filter === 'selected'
                  ? 'border-foreground bg-foreground text-background hover:bg-foreground/90'
                  : 'border-border/60 bg-transparent text-muted-foreground hover:border-border hover:bg-muted/40 hover:text-foreground'
              )}
            >
              <Heart className={cn('h-3.5 w-3.5 transition-transform', filter === 'selected' && 'fill-current')} />
              Đã chọn
            </Button>
            <Button
              variant={filter === 'unselected' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('unselected')}
              aria-pressed={filter === 'unselected'}
              className={cn(
                'h-9 shrink-0 rounded-full px-4 text-sm font-medium transition-all duration-200 border',
                filter === 'unselected'
                  ? 'border-foreground bg-foreground text-background hover:bg-foreground/90'
                  : 'border-border/60 bg-transparent text-muted-foreground hover:border-border hover:bg-muted/40 hover:text-foreground'
              )}
            >
              Chưa chọn
            </Button>
          </div>

          <div className="flex items-center gap-2 self-start lg:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setComparisonOpen(true)}
              disabled={filteredPhotos.length < 2}
              className={cn(
                'h-9 shrink-0 rounded-full border-border/60 bg-transparent px-4 text-sm font-medium transition-all duration-200 gap-1.5 hover:border-border hover:bg-muted/40 hover:text-foreground',
                filteredPhotos.length < 2 && 'opacity-60'
              )}
            >
              <Columns2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">So sánh ảnh</span>
              <span className="inline sm:hidden">So sánh</span>
            </Button>

            <Popover open={facePopoverOpen} onOpenChange={setFacePopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 w-9 shrink-0 rounded-full border-amber-500/40 bg-amber-500/10 px-0 text-amber-700 hover:bg-amber-500/15 hover:text-amber-800 sm:w-auto sm:px-4"
                  title="Tìm ảnh theo khuôn mặt"
                >
                  <Sparkles className="h-4 w-4" />
                  <span className="ml-2 hidden sm:inline">Lọc ảnh theo khuôn mặt</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72">
                  <div className="flex flex-col gap-3">
                    <div className="text-sm font-medium text-foreground">Tìm ảnh theo khuôn mặt</div>
                    <div className="text-sm text-muted-foreground">
                      Chọn một ảnh selfie hoặc chụp mới để tìm các ảnh có cùng khuôn mặt.
                    </div>

                    <input
                      ref={faceFileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const f = e.target.files?.[0]
                        if (f) await handleFaceFile(f)
                      }}
                    />
                    <input
                      ref={faceCameraInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={async (e) => {
                        const f = e.target.files?.[0]
                        if (f) await handleFaceFile(f)
                      }}
                    />

                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" size="sm" onClick={() => openFacePicker('file')}>
                        Tải ảnh
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => openFacePicker('camera')}>
                        <Camera className="mr-1 h-4 w-4" />
                        Chụp ảnh
                      </Button>
                    </div>

                    {isAILoading && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Đang quét khuôn mặt...
                      </div>
                    )}
                  </div>
              </PopoverContent>
            </Popover>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 shrink-0 min-w-[128px] justify-between rounded-full border-border/60 bg-transparent px-4 text-sm font-medium transition-all duration-200 gap-2 hover:border-border hover:bg-muted/40 hover:text-foreground"
                >
                  <span className="hidden sm:inline">Sắp xếp: {sortBy === 'date' ? 'Ngày' : 'Tên file'}</span>
                  <span className="inline sm:hidden">Sắp xếp</span>
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setSortBy('date')}>
                  <Check className={cn('mr-2 h-4 w-4', sortBy !== 'date' && 'opacity-0')} />
                  Ngày
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('filename')}>
                  <Check className={cn('mr-2 h-4 w-4', sortBy !== 'filename' && 'opacity-0')} />
                  Tên file
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-6 pb-44 sm:px-6 sm:pb-6 lg:px-8">
        {filteredPhotos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Heart className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <h3 className="text-lg font-medium text-foreground">Không tìm thấy ảnh</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {filter === 'selected' ? 'Bạn chưa chọn ảnh nào.' : 'Tất cả ảnh đã được chọn.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {filteredPhotos.map((photo) => (
              <PhotoCard
                key={photo.id}
                photo={photo}
                onSelect={handleSelect}
                onComment={handleOpenComment}
                onOpen={handleOpenLightbox}
                highlighted={highlightedPhotoIds.has(photo.id)}
                aiGroupSize={(photo as any).aiGroupSize}
              />
            ))}
          </div>
        )}
      </main>

      <footer className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <p className="text-sm text-muted-foreground">
            {selectedCount} / {maxSelections} ảnh đã chọn
          </p>
          <Button onClick={handleSubmit} disabled={selectedCount === 0 || isSubmitting} className="px-6">
            {isSubmitting ? 'Đang gửi...' : 'Gửi lựa chọn cho Studio'}
          </Button>
        </div>
      </footer>

      <Lightbox
        photos={filteredPhotos}
        currentIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onNavigate={setLightboxIndex}
        onSelect={handleSelect}
        onComment={handleOpenComment}
      />

      <CommentModal
        photo={commentPhoto}
        isOpen={commentModalOpen}
        onClose={() => setCommentModalOpen(false)}
        onSave={handleSaveComment}
      />

      <ComparisonViewer
        photos={filteredPhotos}
        isOpen={comparisonOpen}
        onClose={() => setComparisonOpen(false)}
        onSelect={handleSelect}
        onComment={handleOpenComment}
      />

      <Dialog
        open={feedbackOpen}
        onOpenChange={(open) => {
          setFeedbackOpen(open)
          if (!open) setFeedbackState(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="space-y-4 text-center sm:text-left">
            <div
              className={cn(
                'mx-auto flex h-14 w-14 items-center justify-center rounded-full sm:mx-0',
                feedbackState?.variant === 'success' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'
              )}
            >
              {feedbackState?.variant === 'success' ? (
                <CheckCircle2 className="h-7 w-7" />
              ) : (
                <AlertCircle className="h-7 w-7" />
              )}
            </div>
            <div className="space-y-1">
              <DialogTitle className="text-xl">{feedbackState?.title || 'Thông báo'}</DialogTitle>
              <DialogDescription className="text-sm leading-6">{feedbackState?.description || ''}</DialogDescription>
            </div>
          </DialogHeader>
          <DialogFooter>
            <Button
              className="w-full sm:w-auto"
              onClick={() => {
                setFeedbackOpen(false)
                setFeedbackState(null)
              }}
            >
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
