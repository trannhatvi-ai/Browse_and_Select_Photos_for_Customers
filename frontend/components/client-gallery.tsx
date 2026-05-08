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
        url_hash: p.url_hash, // Preserve hash for search matching
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

  const canonicalizeCloudinaryUrl = (url: string) => {
    if (!url) return ''
    try {
      const parsed = new URL(url)
      if (!parsed.hostname.includes('res.cloudinary.com')) {
        return url.split('?')[0]
      }

      const marker = '/image/upload/'
      if (!parsed.pathname.includes(marker)) {
        return url.split('?')[0]
      }

      const parts = parsed.pathname.split(marker)
      const prefix = parts[0].replace(/^\//, '')
      const remainder = parts[1] || ''
      const segments = remainder.split('/').filter(Boolean)
      if (segments.length === 0) return url.split('?')[0]

      const versionIndex = segments.findIndex(segment => /^v\d+$/.test(segment))
      const publicId = versionIndex >= 0 && versionIndex + 1 < segments.length
        ? segments.slice(versionIndex + 1).join('/')
        : segments.join('/')

      return prefix
        ? `${parsed.protocol}//${parsed.hostname}/${prefix}/image/upload/${publicId}`
        : `${parsed.protocol}//${parsed.hostname}/image/upload/${publicId}`
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
        setSemanticStatus(`Đang tìm ảnh cho: "${query}"...`)
        setSemanticAlert({
          variant: 'info',
          title: 'Đang tìm ảnh',
          description: `Đang tìm ảnh cho: "${query}"...`,
        })
      setSemanticMatchedIds(null)
      setHighlightedPhotoIds(new Set())
        const res = await fetch('/api/search/semantic', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ project_id: projectId, query: query, top_k: 50 }),
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

      const normalizeSearchUrl = (url: string) => normalizeCloudinaryUrl(url || '').split('?')[0]
      const canonicalSearchUrl = (url: string) => canonicalizeCloudinaryUrl(url || '').split('?')[0]

      const photoSearchKeys = (photo: any) => {
        const keys = new Set<string>()
        if (photo.url_hash) keys.add(String(photo.url_hash))

        for (const candidate of [photo.src, photo.originalUrl]) {
          if (!candidate) continue
          keys.add(candidate)
          keys.add(normalizeSearchUrl(candidate))
          keys.add(canonicalSearchUrl(candidate))
          const publicId = extractPublicId(candidate)
          if (publicId) {
            keys.add(publicId)
            keys.add(publicId.split('/').pop() || publicId)
          }
          const filename = candidate.split('/').pop()?.split('?')[0]?.split('.')[0]
          if (filename) keys.add(filename)
        }

        if (photo.filename) {
          keys.add(photo.filename)
          keys.add(photo.filename.split('.')[0])
        }

        return [...keys].filter(Boolean)
      }

      const resultSearchKeys = (result: any) => {
        const url = result.image_url || result.imageUrl || ''
        const originalUrl = result.metadata?.original_url || ''
        const keys = new Set<string>()
        if (result.url_hash) keys.add(String(result.url_hash))
        if (url) {
          keys.add(url)
          keys.add(normalizeSearchUrl(url))
          keys.add(canonicalSearchUrl(url))
          const publicId = extractPublicId(url)
          if (publicId) {
            keys.add(publicId)
            keys.add(publicId.split('/').pop() || publicId)
          }
          const filename = url.split('/').pop()?.split('?')[0]?.split('.')[0]
          if (filename) keys.add(filename)
        }
        // Also add original_url from metadata
        if (originalUrl) {
          keys.add(originalUrl)
          keys.add(normalizeSearchUrl(originalUrl))
          keys.add(canonicalSearchUrl(originalUrl))
          const publicId = extractPublicId(originalUrl)
          if (publicId) {
            keys.add(publicId)
            keys.add(publicId.split('/').pop() || publicId)
          }
          const filename = originalUrl.split('/').pop()?.split('?')[0]?.split('.')[0]
          if (filename) keys.add(filename)
        }
        return [...keys].filter(Boolean)
      }

      // Build a robust mapping from various identifiers to photo IDs
      const idMap: Record<string, string> = {}
      console.log('Semantic Search: Building ID Map from photos:', photos.length)
      for (const p of photos) {
        const keys = photoSearchKeys(p as any)
        if (keys.length > 0) {
          console.log(`  Photo ${p.id}: keys=`, keys)
        }
        for (const key of keys) {
          idMap[key] = p.id
        }
      }

      console.log('Semantic Search: Final ID Map size:', Object.keys(idMap).length)
      console.log('Semantic Search: ID Map keys sample:', Object.keys(idMap).slice(0, 10))

      const matches = new Set<string>()
      for (const r of data.results || []) {
        const resultKeys = resultSearchKeys(r)
        console.log(`Semantic Search: Result (score=${r.score}): image_url="${r.image_url}", keys=`, resultKeys)
        let matchedId = null
        for (const key of resultKeys) {
          if (idMap[key]) {
            console.log(`  -> MATCH found! key="${key}" maps to photo ${idMap[key]}`)
            matchedId = idMap[key]
            break
          }
        }
        if (!matchedId) {
          console.log(`  -> NO MATCH for result. Tried keys: ${resultKeys.join(', ')}`)
        }

        if (matchedId) {
          matches.add(matchedId)
        }
      }

      console.log(`Semantic Search: Mapped ${matches.size} matches from ${data.results?.length || 0} backend results`)
      
      // Update photos with scores
      setPhotos(prev => prev.map(p => {
        const result = (data.results || []).find((r: any) => {
          const resultKeys = resultSearchKeys(r)
          const photoKeys = photoSearchKeys(p as any)
          return resultKeys.some(key => photoKeys.includes(key))
        })
        return result ? { ...p, score: result.score } : { ...p, score: undefined }
      }))

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
        const photo = p as any
        // Primary: use url_hash if available
        if (photo.url_hash) {
          urlToId[photo.url_hash] = p.id
        }
        // Fallbacks
        urlToId[normalizeCloudinaryUrl(p.src)] = p.id
        urlToId[p.src.split('?')[0]] = p.id
        urlToId[p.filename] = p.id
      }

      const matches = new Set<string>()
      for (const r of data.results || []) {
        // Primary: match by url_hash
        const resultHash = r.url_hash
        if (resultHash && urlToId[resultHash]) {
          matches.add(urlToId[resultHash])
          continue
        }

        // Fallback: match by normalized URL
        const key = normalizeCloudinaryUrl(r.image_url || r.imageUrl || '')
        let id = urlToId[key]
        if (!id) {
          const filename = r.image_url?.split('/').pop()?.split('.')[0] || ''
          id = urlToId[filename]
        }
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
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 shrink-0">
              <Camera className="h-6 w-6 text-foreground" />
              <span className="text-lg font-bold text-foreground">Studio Pro</span>
            </div>

            {/* Desktop Search - Right aligned */}
            <div className="hidden sm:flex relative max-w-md flex-1 ml-auto">
              <div className="relative w-full">
                <Input
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    if (!e.target.value.trim()) {
                      setSemanticMatchedIds(null)
                      setHighlightedPhotoIds(new Set())
                    }
                  }}
                  placeholder="Tìm theo mô tả..."
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
            </div>

            <div className="flex items-center gap-4 shrink-0">
              <div className="text-right">
                <div className="text-sm font-medium text-foreground">
                  Xin chào, <span className="font-bold">{projectData?.clientName || 'Khách hàng'}</span>
                </div>
              </div>
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
        <div className="mx-auto flex max-w-7xl items-center gap-2 overflow-x-auto px-4 py-2 sm:px-6 lg:px-8 no-scrollbar sm:justify-between">
          <div className={cn(
            "flex items-center gap-1.5 shrink-0 transition-all duration-300",
            isSearchExpanded ? "w-0 opacity-0 overflow-hidden" : "w-auto opacity-100"
          )}>
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
              className={cn(
                'h-8 sm:h-11 rounded-full px-3 sm:px-6 text-[13px] sm:text-base font-medium transition-all duration-200',
                filter === 'all' ? 'bg-foreground text-background' : 'bg-transparent text-muted-foreground'
              )}
            >
              Tất cả
            </Button>
            <Button
              variant={filter === 'selected' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('selected')}
              className={cn(
                'h-8 sm:h-11 rounded-full px-3 sm:px-6 text-[13px] sm:text-base font-medium transition-all duration-200 gap-1.5',
                filter === 'selected' ? 'bg-foreground text-background' : 'bg-transparent text-muted-foreground'
              )}
            >
              <Heart className={cn('h-3.5 w-3.5 sm:h-5 sm:w-5', filter === 'selected' && 'fill-current')} />
              <span className="hidden sm:inline">Đã chọn</span>
              <span className="sm:hidden">Đã chọn</span>
            </Button>
            <Button
              variant={filter === 'unselected' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('unselected')}
              className={cn(
                'h-8 sm:h-11 rounded-full px-3 sm:px-6 text-[13px] sm:text-base font-medium transition-all duration-200',
                filter === 'unselected' ? 'bg-foreground text-background' : 'bg-transparent text-muted-foreground'
              )}
            >
              <span className="hidden sm:inline">Chưa chọn</span>
              <span className="sm:hidden">Chưa</span>
            </Button>
            <div className="w-px h-4 bg-border/40 mx-0.5" />
          </div>

          <div className={cn(
            "flex items-center gap-1.5 transition-all duration-300 flex-1",
            isSearchExpanded ? "w-full" : "justify-end"
          )}>
            {/* Mobile Expandable Search */}
            <div className={cn(
              "relative transition-all duration-300 sm:hidden",
              isSearchExpanded ? "flex-1" : "w-8"
            )}>
              {isSearchExpanded ? (
                <div className="relative w-full flex items-center">
                  <Input
                    autoFocus
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onBlur={() => !searchQuery && setIsSearchExpanded(false)}
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        if (searchQuery.trim()) await performSemanticSearch(searchQuery.trim())
                      }
                    }}
                    placeholder="Tìm ảnh..."
                    className="h-8 w-full rounded-full pl-8 pr-8 text-xs bg-muted/50 border-none focus-visible:ring-1"
                  />
                  <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <button
                    onClick={() => { setIsSearchExpanded(false); clearSemanticSearch(); }}
                    className="absolute right-2.5"
                  >
                    <X className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 rounded-full p-0 text-muted-foreground hover:bg-muted/50"
                  onClick={() => setIsSearchExpanded(true)}
                >
                  <Search className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className={cn(
              "flex items-center gap-1.5 transition-opacity duration-300",
              isSearchExpanded && "hidden sm:flex"
            )}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setComparisonOpen(true)}
                disabled={filteredPhotos.length < 2}
                className="h-8 w-8 sm:h-11 sm:w-auto rounded-full border-border/60 p-0 sm:px-5 sm:gap-2"
              >
                <Columns2 className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
                <span className="hidden sm:inline sm:text-base">So sánh</span>
              </Button>

              <Popover open={facePopoverOpen} onOpenChange={setFacePopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 sm:h-11 sm:w-auto rounded-full border-amber-500/30 bg-amber-500/5 p-0 sm:px-5 sm:gap-2 text-amber-700 hover:bg-amber-500/10"
                    title="Tìm ảnh theo khuôn mặt"
                  >
                    <Sparkles className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
                    <span className="hidden sm:inline sm:text-base">Lọc khuôn mặt</span>
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
                    className="h-8 w-8 sm:h-11 sm:w-auto rounded-full border-border/60 p-0 sm:px-5 sm:gap-2"
                  >
                    <ChevronDown className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
                    <span className="hidden sm:inline text-base">Sắp xếp: {sortBy === 'date' ? 'Ngày' : 'Tên'}</span>
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
                projectId={projectData?.id || token}
                onIndexed={fetchGalleryData}
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
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 gap-4 sm:gap-10">
          <div className="flex-1 min-w-0 max-w-md">
            <div className="flex items-center justify-between mb-1.5 text-[11px] sm:text-xs font-bold uppercase tracking-wider">
              <span className="text-muted-foreground truncate mr-2">Tiến độ chọn ảnh</span>
              <span className="text-foreground shrink-0">{selectedCount} / {maxSelections}</span>
            </div>
            <Progress value={progressPercent} className="h-2 w-full" />
          </div>

          <Button 
            onClick={handleSubmit} 
            disabled={selectedCount === 0 || isSubmitting} 
            className="h-12 px-6 sm:px-10 text-sm sm:text-base font-bold rounded-full shadow-xl transition-all active:scale-95 shrink-0"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang gửi...
              </>
            ) : (
              <>Gửi cho Studio</>
            )}
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
