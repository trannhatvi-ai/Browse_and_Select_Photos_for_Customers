'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Check, CheckCircle2, ChevronDown, Copy, ImageIcon, LayoutGrid, Link as LinkIcon, Loader2, Maximize2, MousePointer2, Plus, RefreshCw, Save, Settings2, Sparkles, Square, CheckSquare, Trash2, Upload, X } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'
import { StudioLightbox } from '@/components/studio-lightbox'
import { AIInsightSheet } from '@/components/ai-insight-sheet'
import { useIsMobile } from '@/hooks/use-mobile'
import { ProjectDetailsSkeleton } from '@/components/skeletons'

type PhotoItem = {
  id: string
  filename: string
  previewUrl: string
  selected?: boolean
  aiContext?: Record<string, unknown> | null
  originalUrl?: string | null
  url?: string | null
}

type ProjectDetails = {
  id: string
  clientName: string
  clientEmail: string
  eventName: string
  accessToken?: string | null
  maxSelections: number
  status: 'CHOOSING' | 'DONE'
  photos: PhotoItem[]
}

type DriveImportItem = {
  id: string
  name: string
  progress: number
  status: 'pending' | 'downloading' | 'uploading' | 'complete' | 'error'
  message?: string
}

function getStatusLabel(status: ProjectDetails['status']) {
  return status === 'DONE' ? 'Hoàn thành' : 'Khách đang chọn'
}

function getStatusClasses(status: ProjectDetails['status']) {
  return status === 'DONE'
    ? 'bg-emerald-500/15 text-emerald-700 border-emerald-500/20'
    : 'bg-amber-500/15 text-amber-700 border-amber-500/20'
}

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>()
  const projectId = params?.id
  const router = useRouter()
  const isMobile = useIsMobile()

  const [project, setProject] = useState<ProjectDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [configOpen, setConfigOpen] = useState(false)
  const [maxSelectionsDraft, setMaxSelectionsDraft] = useState('')
  const [eventNameDraft, setEventNameDraft] = useState('')
  const [clientNameDraft, setClientNameDraft] = useState('')
  const [clientEmailDraft, setClientEmailDraft] = useState('')
  const [statusDraft, setStatusDraft] = useState<ProjectDetails['status']>('CHOOSING')
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [aiPhoto, setAiPhoto] = useState<PhotoItem | null>(null)
  const [aiSheetOpen, setAiSheetOpen] = useState(false)
  const [deletePhotoTarget, setDeletePhotoTarget] = useState<PhotoItem | null>(null)
  const [deletingPhoto, setDeletingPhoto] = useState(false)
  const [uploadFiles, setUploadFiles] = useState<Array<{ id: string; name: string; progress: number; status: string }>>([])
  const [isUploading, setIsUploading] = useState(false)
  const [driveImportOpen, setDriveImportOpen] = useState(false)
  const [driveLinks, setDriveLinks] = useState('')
  const [driveImportItems, setDriveImportItems] = useState<DriveImportItem[]>([])
  const [isImportingDrive, setIsImportingDrive] = useState(false)
  const [aiStats, setAiStats] = useState<{
    total_photos: number
    context_photos_db: number
    indexed_photos_qdrant: number
    percentage_db: number
    percentage_qdrant: number
  } | null>(null)
  const [loadingStats, setLoadingStats] = useState(false)
  const [syncingAi, setSyncingAi] = useState(false)
  const [realProjectId, setRealProjectId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name'>('newest')
  const [syncingPhotos, setSyncingPhotos] = useState<Set<string>>(new Set())
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)

  const aiSyncCompleted = Boolean(
    aiStats &&
    aiStats.context_photos_db >= aiStats.total_photos &&
    aiStats.indexed_photos_qdrant >= aiStats.total_photos &&
    aiStats.total_photos > 0
  )
  const aiSyncTooltip = aiSyncCompleted
    ? 'Tất cả ảnh đã sẵn sàng, không cần tạo ngữ cảnh nữa'
    : 'Tạo mô tả AI cho các ảnh mới'

  const fetchAiStats = async (idOverride?: string) => {
    const idToUse = idOverride || realProjectId || projectId
    if (!idToUse) return
    setLoadingStats(true)
    try {
      const res = await fetch(`/api/ai-stats/projects/${idToUse}/stats`)
      if (res.ok) {
        const data = await res.json()
        setAiStats(data)
      }
    } catch (error) {
      console.error('Failed to fetch AI stats', error)
    } finally {
      setLoadingStats(false)
    }
  }

  const fetchDetails = async () => {
    if (!projectId) return

    setLoading(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/details`)
      if (!res.ok) {
        throw new Error('Không thể tải thông tin show chụp')
      }

      const data = await res.json()
      setProject(data)
      setRealProjectId(data.id)
      setMaxSelectionsDraft(String(data.maxSelections ?? 0))
      setEventNameDraft(data.eventName ?? '')
      setClientNameDraft(data.clientName ?? '')
      setClientEmailDraft(data.clientEmail ?? '')
      setStatusDraft(data.status ?? 'CHOOSING')

      // Lấy luôn stats khi load details, truyền ID thật vào luôn
      void fetchAiStats(data.id)
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchDetails()
  }, [projectId])

  const selectedCount = useMemo(
    () => project?.photos?.filter((photo) => photo.selected).length ?? 0,
    [project]
  )

  const photos = project?.photos ?? []
  const photoCount = photos.length
  const aiContextCount = photos.filter((photo) => photo.aiContext && typeof photo.aiContext === 'object').length

  const transferItems = useMemo(
    () => [...uploadFiles, ...driveImportItems],
    [driveImportItems, uploadFiles]
  )

  const overallProgress = useMemo(() => {
    if (transferItems.length === 0) return 0
    const total = transferItems.reduce((acc, file) => acc + file.progress, 0)
    return Math.round(total / transferItems.length)
  }, [transferItems])

  const transferInProgress = isUploading || isImportingDrive

  const allIndexed = useMemo(() => {
    if (!aiStats) return false
    return aiStats.indexed_photos_qdrant >= aiStats.total_photos && aiStats.total_photos > 0
  }, [aiStats])

  const formattedPhotos = useMemo(
    () => photos.map((photo) => ({
      ...photo,
      src: photo.previewUrl || (photo.originalUrl?.startsWith('http') ? photo.originalUrl : null) || photo.url || photo.previewUrl,
    })),
    [photos]
  )

  const handleBulkDelete = async () => {
    if (!project || selectedIds.size === 0) return

    setIsBulkDeleting(true)
    try {
      const res = await fetch(`/api/projects/${project.id}/photos`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoIds: Array.from(selectedIds) }),
      })

      if (!res.ok) throw new Error('Xóa hàng loạt thất bại!')

      toast.success(`Đã xóa ${selectedIds.size} ảnh!`)
      setSelectedIds(new Set())
      setIsSelectionMode(false)
      await fetchDetails()
    } catch (error) {
      toast.error((error as Error).message || 'Lỗi kết nối!')
    } finally {
      setIsBulkDeleting(false)
    }
  }

  const togglePhotoSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleDeletePhoto = async () => {
    if (!project || !deletePhotoTarget) return

    setDeletingPhoto(true)
    try {
      const res = await fetch(`/api/projects/${project.id}/photos`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoId: deletePhotoTarget.id }),
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => null)
        throw new Error(payload?.error || 'Xóa thất bại!')
      }

      toast.success('Đã xóa ảnh!')
      setDeletePhotoTarget(null)
      
      // Logic lướt qua ảnh tiếp theo khi xóa
      if (lightboxOpen) {
        if (photos.length <= 1) {
          setLightboxOpen(false)
        } else if (lightboxIndex >= photos.length - 1) {
          setLightboxIndex(prev => Math.max(0, prev - 1))
        }
        // Nếu không phải ảnh cuối, giữ nguyên index thì nó tự động là ảnh tiếp theo sau khi list cập nhật
      }
      
      await fetchDetails()
    } catch (error) {
      toast.error((error as Error).message || 'Lỗi kết nối!')
    } finally {
      setDeletingPhoto(false)
    }
  }

  const openAiSheet = (photo: PhotoItem) => {
    setAiPhoto(photo)
    setAiSheetOpen(true)
  }

  const handleCopyGalleryLink = async () => {
    if (!project?.accessToken) {
      toast.error('Không có link gallery cho show chụp này')
      return
    }

    await navigator.clipboard.writeText(`${window.location.origin}/gallery/${project.accessToken}`)
    toast.success('Đã copy link gallery!')
  }

  const handleSaveConfig = async () => {
    if (!project) return

    const parsed = Number(maxSelectionsDraft)
    if (!Number.isInteger(parsed) || parsed < 1) {
      toast.error('Số ảnh tối đa phải là số nguyên lớn hơn 0')
      return
    }

    if (!eventNameDraft.trim() || !clientNameDraft.trim() || !clientEmailDraft.trim()) {
      toast.error('Vui lòng điền đầy đủ các thông tin bắt buộc')
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          maxSelections: parsed,
          eventName: eventNameDraft.trim(),
          clientName: clientNameDraft.trim(),
          clientEmail: clientEmailDraft.trim(),
          status: statusDraft
        }),
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => null)
        throw new Error(payload?.error || 'Không thể cập nhật cấu hình')
      }

      toast.success('Đã cập nhật cấu hình show!')
      await fetchDetails()
      setConfigOpen(false)
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const handleUploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0 || !project) return

    const newFiles = Array.from(files).map((file, i) => ({
      id: `${Date.now()}-${i}`,
      name: file.name,
      progress: 0,
      status: 'pending',
      file
    }))

    setIsUploading(true)

    // Batch files (5 per request)
    const BATCH_SIZE = 5
    for (let i = 0; i < newFiles.length; i += BATCH_SIZE) {
      const batch = newFiles.slice(i, i + BATCH_SIZE)

      // Add to tracking
      setUploadFiles(prev => [
        ...prev,
        ...batch.map(f => ({ id: f.id, name: f.name, progress: 0, status: 'uploading' }))
      ])

      const formData = new FormData()
      batch.forEach(f => formData.append('files', f.file))

      try {
        await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest()
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const percent = Math.round((event.loaded / event.total) * 100)
              setUploadFiles(prev => prev.map(f =>
                batch.find(bf => bf.id === f.id) ? { ...f, progress: percent } : f
              ))
            }
          }
          xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve(null) : reject()
          xhr.onerror = () => reject()
          xhr.open('POST', `/api/projects/${project.id}/photos`)
          xhr.send(formData)
        })
        setUploadFiles(prev => prev.map(f =>
          batch.find(bf => bf.id === f.id) ? { ...f, status: 'complete', progress: 100 } : f
        ))
      } catch (err) {
        setUploadFiles(prev => prev.map(f =>
          batch.find(bf => bf.id === f.id) ? { ...f, status: 'error' } : f
        ))
      }
    }

    setIsUploading(false)
    await fetchDetails()
    toast.success(`Đã tải lên thành công ${newFiles.length} ảnh!`)
    // Clear completed uploads after 3s
    setTimeout(() => {
      setUploadFiles(prev => prev.filter(f => f.status !== 'complete' && f.status !== 'error'))
    }, 3000)
  }

  const upsertDriveImportItem = (id: string, patch: Partial<DriveImportItem>) => {
    setDriveImportItems(prev => {
      const existing = prev.find(item => item.id === id)
      if (!existing) {
        return [
          ...prev,
          {
            id,
            name: patch.name || 'Google Drive image',
            progress: patch.progress ?? 0,
            status: patch.status || 'pending',
            message: patch.message,
          },
        ]
      }

      return prev.map(item => item.id === id ? { ...item, ...patch } : item)
    })
  }

  const handleImportDriveLinks = async () => {
    if (!project) return

    const urls = driveLinks
      .split(/\s+/)
      .map(link => link.trim())
      .filter(Boolean)

    if (urls.length === 0) {
      toast.error('Vui lòng dán ít nhất một link Google Drive.')
      return
    }

    setIsImportingDrive(true)
    setDriveImportItems(urls.map((url, index) => ({
      id: `link-${index}`,
      name: url,
      progress: 5,
      status: 'pending',
      message: 'Đang chuẩn bị đọc link...',
    })))

    let uploaded = 0
    let failed = 0

    try {
      const res = await fetch(`/api/projects/${project.id}/photos/google-drive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls }),
      })

      if (!res.body) {
        const payload = await res.json().catch(() => null)
        throw new Error(payload?.error || 'Không thể bắt đầu tải ảnh từ Google Drive.')
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.trim()) continue
          const event = JSON.parse(line)

          if (event.type === 'queued') {
            setDriveImportItems(event.items.map((item: any) => ({
              id: item.id,
              name: item.name,
              progress: 10,
              status: 'pending',
              message: 'Đã nhận link, chờ tải ảnh...',
            })))
          }

          if (event.type === 'item-start') {
            upsertDriveImportItem(event.id, {
              name: event.name,
              progress: 30,
              status: 'downloading',
              message: event.message,
            })
          }

          if (event.type === 'item-uploading') {
            upsertDriveImportItem(event.id, {
              progress: 70,
              status: 'uploading',
              message: event.message,
            })
          }

          if (event.type === 'item-complete') {
            upsertDriveImportItem(event.id, {
              name: event.name,
              progress: 100,
              status: 'complete',
              message: 'Đã tải lên Cloudinary.',
            })
          }

          if (event.type === 'item-error') {
            upsertDriveImportItem(event.id, {
              name: event.name,
              progress: 100,
              status: 'error',
              message: event.message,
            })
          }

          if (event.type === 'done') {
            uploaded = event.uploaded || 0
            failed = event.failed || 0
          }

          if (event.type === 'error') {
            throw new Error(event.message)
          }
        }
      }

      if (uploaded > 0) {
        await fetchDetails()
        toast.success(`Đã tải ${uploaded} ảnh từ Google Drive!`)
        setDriveLinks('')
      }

      if (failed > 0) {
        toast.error(`${failed} link Google Drive không tải được. Vui lòng kiểm tra quyền truy cập.`)
      }
    } catch (error) {
      toast.error((error as Error).message || 'Không thể tải ảnh từ Google Drive.')
    } finally {
      setIsImportingDrive(false)
    }
  }

  if (loading) {
    return <ProjectDetailsSkeleton />
  }

  if (!project) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 text-center">
        <p className="text-sm text-muted-foreground">Không tìm thấy show chụp.</p>
        <Button className="mt-4" variant="outline" onClick={() => router.push('/dashboard/projects')}>
          Quay lại danh sách
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-0 pb-36 sm:px-6 lg:px-8">
      {transferInProgress && (
        <div className="fixed top-0 left-0 right-0 z-[100] h-1 bg-muted/30">
          <div
            className="h-full bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.5)] transition-all duration-300 ease-out"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      )}
      <header className="sticky top-0 z-30 mb-6 -mx-4 border-b bg-background/95 p-4 backdrop-blur sm:-mx-6 sm:p-6 lg:-mx-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0 sm:gap-4">
            <Button variant="ghost" size="icon" className="shrink-0" onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-xl font-bold tracking-tight sm:text-3xl">
                  {project.eventName}
                </h1>
                <Badge variant="outline" className={cn('whitespace-nowrap rounded-md px-2 py-0.5 text-[10px] font-medium sm:text-xs', getStatusClasses(project.status))}>
                  {getStatusLabel(project.status)}
                </Badge>
              </div>
              <p className="truncate text-xs text-muted-foreground sm:text-sm mt-0.5">
                {project.clientName} . {project.clientEmail} . {project.id.slice(0, 8).toUpperCase()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden lg:block">
               <div title={aiSyncTooltip}>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    'h-10 px-4 gap-2 rounded-xl transition-all shadow-sm',
                    aiSyncCompleted
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700 opacity-90'
                      : 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                  )}
                  onClick={async () => {
                    if (aiSyncCompleted) return
                    setSyncingAi(true)
                    try {
                      const idToUse = realProjectId || project.id
                      const res = await fetch(`/api/ai-stats/projects/${idToUse}/sync`, { method: 'POST' })
                      if (res.ok) {
                        const data = await res.json()
                        toast.success(`Đã bắt đầu tạo ngữ cảnh cho ${data.queued_count} ảnh!`)
                        setTimeout(fetchAiStats, 2000)
                      }
                    } catch (err) {} finally {
                      setSyncingAi(false)
                    }
                  }}
                  disabled={loadingStats || syncingAi || aiSyncCompleted}
                >
                  {syncingAi ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : aiSyncCompleted ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  <span className="hidden xl:inline">{aiSyncCompleted ? 'Đã hoàn thành AI' : 'Tạo ngữ cảnh AI'}</span>
                </Button>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-9 gap-2 sm:h-10 transition-all duration-300 rounded-xl",
                isSelectionMode 
                  ? "bg-primary/10 border-primary/30 text-primary shadow-[0_0_15px_rgba(var(--primary),0.1)]" 
                  : "hover:bg-accent/50"
              )}
              onClick={() => {
                setIsSelectionMode(!isSelectionMode)
                setSelectedIds(new Set())
              }}
            >
              <MousePointer2 className={cn("h-4 w-4 transition-transform", isSelectionMode && "scale-110")} />
              <span className="hidden sm:inline font-medium">{isSelectionMode ? 'Đang chọn...' : 'Chọn nhiều'}</span>
            </Button>

            <Button variant="outline" size="sm" className="h-9 gap-2 sm:h-10" onClick={() => document.getElementById('quick-upload')?.click()}>
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Thêm ảnh</span>
              <input
                id="quick-upload"
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={(e) => handleUploadFiles(e.target.files)}
              />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-2 sm:h-10"
              onClick={() => setDriveImportOpen(true)}
            >
              <LinkIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Google Drive</span>
            </Button>
            <Button variant="outline" size="sm" className="h-9 gap-2 sm:h-10 sm:px-4" onClick={() => setConfigOpen(true)}>
              <Settings2 className="h-4 w-4" />
              <span className="hidden sm:inline">Cấu hình</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {photos.map((photo, index) => {
            const isSelected = lightboxIndex === index
            
            return (
              <div
                key={photo.id}
                className={cn(
                  'group relative aspect-[3/4] cursor-pointer overflow-hidden rounded-2xl bg-muted transition-all duration-300 hover:shadow-xl',
                  (isSelected && !isSelectionMode) && 'ring-2 ring-primary ring-offset-2',
                  (isSelectionMode && selectedIds.has(photo.id)) && 'ring-4 ring-primary ring-offset-2 shadow-2xl'
                )}
                onClick={() => {
                  if (isSelectionMode) {
                    togglePhotoSelection(photo.id)
                  } else {
                    setLightboxIndex(index)
                    setLightboxOpen(true)
                  }
                }}
              >
                <img
                  src={photo.previewUrl || photo.url || ''}
                  alt={photo.filename}
                  className={cn(
                    "h-full w-full object-cover transition-transform duration-500",
                    !isSelectionMode && "group-hover:scale-110",
                    isSelectionMode && selectedIds.has(photo.id) && "opacity-75 scale-95"
                  )}
                  loading="lazy"
                />
                
                {isSelectionMode && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/10 backdrop-blur-[2px] transition-all">
                    <div className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-2xl border-2 transition-all duration-300 shadow-2xl",
                      selectedIds.has(photo.id) 
                        ? "bg-primary border-primary text-primary-foreground scale-110 rotate-0 shadow-primary/40" 
                        : "bg-white/10 border-white/40 text-white/50 scale-90 -rotate-6 backdrop-blur-md"
                    )}>
                      {selectedIds.has(photo.id) ? (
                        <CheckSquare className="h-7 w-7" />
                      ) : (
                        <Square className="h-7 w-7 opacity-20" />
                      )}
                    </div>
                  </div>
                )}

                {!isSelectionMode && (
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-100 transition-opacity duration-300 sm:opacity-0 sm:group-hover:opacity-100">
                    <div className="absolute right-2 top-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          openAiSheet(photo)
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-amber-400 backdrop-blur-md transition-all hover:bg-black/60 shadow-lg"
                        title="AI Insight"
                      >
                        <Sparkles className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <div className="absolute inset-x-0 bottom-0 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-[10px] font-medium text-white/90">{photo.filename}</p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeletePhotoTarget(photo)
                          }}
                          className="text-white/60 hover:text-red-400 transition-colors"
                          title="Xóa ảnh"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {(photo.selected && !isSelectionMode) && (
                  <div className="absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-green-500 text-white shadow-lg ring-2 ring-white">
                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {photoCount === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
            <ImageIcon className="mb-4 h-12 w-12 opacity-20" />
            <p className="text-lg font-semibold text-foreground/70">Chưa có ảnh nào</p>
            <p className="text-sm">Hãy upload ảnh để bắt đầu show chụp.</p>
          </div>
        )}
      </main>



      <Sheet open={configOpen} onOpenChange={setConfigOpen}>
        <SheetContent side={isMobile ? 'bottom' : 'right'} className={isMobile ? 'h-[72vh] w-full overflow-y-auto rounded-t-3xl border-none px-0' : 'w-full overflow-y-auto sm:max-w-md px-0'}>
          <div className="px-4 pb-8 pt-2 sm:px-6">
            {isMobile ? (
              <div className="flex items-center justify-center">
                <div className="mb-4 h-1.5 w-14 rounded-full bg-muted-foreground/25" />
              </div>
            ) : null}
            <SheetHeader className="space-y-2 pb-6">
              <SheetTitle className="flex items-center gap-2 text-lg">
                <Settings2 className="h-5 w-5 text-primary" />
                Cấu hình show chụp
              </SheetTitle>
              <SheetDescription>
                Điều chỉnh các thiết lập cho show này.
              </SheetDescription>
            </SheetHeader>

            <div className="mb-6 space-y-3">
              <div title={aiSyncTooltip} className="w-full">
                <Button
                  className={cn(
                    'w-full h-12 rounded-2xl shadow-lg transition-all',
                    aiSyncCompleted
                      ? 'border border-emerald-200 bg-emerald-50 text-emerald-700 cursor-not-allowed opacity-90'
                      : 'bg-amber-500 text-white hover:bg-amber-600'
                  )}
                  onClick={async () => {
                    if (aiSyncCompleted) return
                    setSyncingAi(true)
                    try {
                      const idToUse = realProjectId || project.id
                      const res = await fetch(`/api/ai-stats/projects/${idToUse}/sync`, { method: 'POST' })
                      if (res.ok) {
                        const data = await res.json()
                        toast.success(`Đã bắt đầu tạo ngữ cảnh cho ${data.queued_count} ảnh!`)
                        setTimeout(fetchAiStats, 2000)
                      }
                    } catch (err) {} finally {
                      setSyncingAi(false)
                    }
                  }}
                  disabled={loadingStats || syncingAi || aiSyncCompleted}
                >
                  {syncingAi ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : aiSyncCompleted ? <CheckCircle2 className="h-5 w-5 mr-2" /> : <Sparkles className="h-5 w-5 mr-2" />}
                  {aiSyncCompleted ? 'Đã hoàn thành AI' : 'Tạo ngữ cảnh AI'}
                </Button>
              </div>
            </div>

              <div className="rounded-3xl border border-border/70 bg-gradient-to-b from-muted/40 to-background p-4 shadow-sm space-y-6 sm:p-5">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="event-name" className="text-xs text-muted-foreground">Tên sự kiện</Label>
                    <Input id="event-name" value={eventNameDraft} onChange={e => setEventNameDraft(e.target.value)} className="bg-background" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="client-name" className="text-xs text-muted-foreground">Tên khách hàng</Label>
                    <Input id="client-name" value={clientNameDraft} onChange={e => setClientNameDraft(e.target.value)} className="bg-background" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="client-email" className="text-xs text-muted-foreground">Email</Label>
                    <Input id="client-email" type="email" value={clientEmailDraft} onChange={e => setClientEmailDraft(e.target.value)} className="bg-background" />
                  </div>

                  <div className="grid gap-4 pt-2 border-t border-dashed sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Trạng thái show</Label>
                      <Select value={statusDraft} onValueChange={(v: any) => setStatusDraft(v)}>
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Chọn trạng thái" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CHOOSING">Đang chọn</SelectItem>
                          <SelectItem value="DONE">Hoàn thành</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="max-selections-mobile" className="text-xs text-muted-foreground">Số ảnh tối đa</Label>
                      <Input
                        id="max-selections-mobile"
                        type="number"
                        min={1}
                        value={maxSelectionsDraft}
                        onChange={(event) => setMaxSelectionsDraft(event.target.value)}
                        className="bg-background"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-dashed space-y-4">
                  <Button
                    variant="outline"
                    className="w-full h-20 flex-col gap-2 rounded-2xl border-dashed border-2 bg-background/70 shadow-sm"
                    onClick={() => document.getElementById('sheet-upload')?.click()}
                  >
                    <Plus className="h-6 w-6 text-muted-foreground" />
                    <span className="text-xs font-medium">Tải lên ảnh mới</span>
                    <input
                      id="sheet-upload"
                      type="file"
                      multiple
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleUploadFiles(e.target.files)}
                    />
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full h-16 flex-col gap-1 rounded-2xl border-dashed border-2 bg-background/70 shadow-sm"
                    onClick={() => setDriveImportOpen(true)}
                  >
                    <LinkIcon className="h-5 w-5 text-muted-foreground" />
                    <span className="text-xs font-medium">Tải ảnh từ link Google Drive</span>
                  </Button>

                  {transferItems.length > 0 && (
                    <div className="space-y-2">
                      {transferItems.map(file => (
                        <div key={file.id} className="text-xs space-y-1.5 p-3 rounded-xl bg-background border shadow-sm">
                          <div className="flex justify-between gap-2">
                            <span className="truncate font-medium">{file.name}</span>
                            <span className="text-muted-foreground">{file.status === 'complete' ? 'Thành công' : `${file.progress}%`}</span>
                          </div>
                          <Progress value={file.progress} className="h-1.5" />
                          {'message' in file && (file as DriveImportItem).message ? (
                            <p className="text-[10px] leading-relaxed text-muted-foreground">{(file as DriveImportItem).message}</p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Button className="h-12 w-full gap-2 rounded-2xl text-base shadow-lg" onClick={handleSaveConfig} disabled={saving}>
                  {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                  Lưu cấu hình
                </Button>
              </div>
            </div>
        </SheetContent>
      </Sheet>

      <Dialog open={driveImportOpen} onOpenChange={(open) => !isImportingDrive && setDriveImportOpen(open)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader className="space-y-2 text-left">
            <DialogTitle>Tải ảnh từ Google Drive</DialogTitle>
            <DialogDescription>
              Dán một hoặc nhiều link ảnh Google Drive. Link cần được bật quyền “Anyone with the link can view” để hệ thống tải được ảnh.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Textarea
              value={driveLinks}
              onChange={(event) => setDriveLinks(event.target.value)}
              disabled={isImportingDrive}
              placeholder="https://drive.google.com/file/d/.../view"
              className="min-h-32 resize-y"
            />

            {driveImportItems.length > 0 && (
              <div className="max-h-64 space-y-2 overflow-y-auto rounded-xl border bg-muted/20 p-3">
                {driveImportItems.map(item => (
                  <div key={item.id} className="space-y-2 rounded-lg border bg-background p-3 text-xs shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate font-medium">{item.name}</span>
                      <span className={cn(
                        'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                        item.status === 'complete' && 'bg-emerald-500/10 text-emerald-700',
                        item.status === 'error' && 'bg-red-500/10 text-red-700',
                        item.status !== 'complete' && item.status !== 'error' && 'bg-sky-500/10 text-sky-700'
                      )}>
                        {item.status === 'complete'
                          ? 'Xong'
                          : item.status === 'error'
                            ? 'Không tải được'
                            : item.status === 'uploading'
                              ? 'Đang upload'
                              : item.status === 'downloading'
                                ? 'Đang tải'
                                : 'Đang chờ'}
                      </span>
                    </div>
                    <Progress value={item.progress} className="h-1.5" />
                    {item.message && (
                      <p className="text-[11px] leading-relaxed text-muted-foreground">{item.message}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isImportingDrive}
              onClick={() => setDriveImportOpen(false)}
            >
              Đóng
            </Button>
            <Button
              type="button"
              disabled={isImportingDrive}
              onClick={handleImportDriveLinks}
              className="gap-2"
            >
              {isImportingDrive ? <Loader2 className="h-4 w-4 animate-spin" /> : <LinkIcon className="h-4 w-4" />}
              {isImportingDrive ? 'Đang tải ảnh...' : 'Bắt đầu tải ảnh'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Actions Bar */}
      {isSelectionMode && selectedIds.size > 0 && (
        <div className="fixed bottom-8 left-1/2 z-[200] -translate-x-1/2 px-4 w-full max-w-lg animate-in fade-in slide-in-from-bottom-6 duration-500 cubic-bezier(0.16, 1, 0.3, 1)">
          <div className="flex items-center justify-between gap-4 rounded-3xl bg-black/80 p-2 pl-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-2xl ring-1 ring-white/10">
            <div className="flex items-center gap-4">
              <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                <span className="text-lg font-black">{selectedIds.size}</span>
                <div className="absolute -right-1 -top-1 h-3 w-3 animate-ping rounded-full bg-white/40" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-white tracking-tight">Đã chọn {selectedIds.size} ảnh</span>
                <span className="text-[10px] font-medium text-white/40 uppercase tracking-[0.1em]">Sẵn sàng để thực hiện</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setIsSelectionMode(false)
                  setSelectedIds(new Set())
                }}
                className="h-12 rounded-2xl hover:bg-white/5 text-white/60 hover:text-white transition-all font-medium px-4"
              >
                Hủy
              </Button>
              <Button 
                variant="destructive" 
                size="sm" 
                disabled={isBulkDeleting}
                onClick={handleBulkDelete}
                className="h-12 gap-2 rounded-2xl px-6 font-bold shadow-xl transition-all active:scale-95 bg-red-500 hover:bg-red-600 border-none"
              >
                {isBulkDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-5 w-5" />
                )}
                <span>Xóa hàng loạt</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      <StudioLightbox
        photos={formattedPhotos}
        currentIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onNavigate={setLightboxIndex}
        onDelete={(photo) => {
          const target = photos.find((item) => item.id === photo.id) ?? null
          setDeletePhotoTarget(target)
        }}
      />

      <AIInsightSheet
        photo={aiPhoto}
        open={aiSheetOpen}
        onOpenChange={setAiSheetOpen}
      />

      <AlertDialog open={Boolean(deletePhotoTarget)} onOpenChange={(open) => !open && setDeletePhotoTarget(null)}>
        <AlertDialogContent className="z-[150]">
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa ảnh này?</AlertDialogTitle>
            <AlertDialogDescription>
              Ảnh <strong>{deletePhotoTarget?.filename}</strong> sẽ bị xóa khỏi show chụp. Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingPhoto}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              disabled={deletingPhoto}
              onClick={(event) => {
                event.preventDefault()
                void handleDeletePhoto()
              }}
            >
              {deletingPhoto ? (
                <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Đang xóa...</span>
              ) : (
                'Xóa'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
