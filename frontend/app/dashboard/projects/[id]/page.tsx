'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle2, Copy, ImageIcon, Loader2, Plus, RefreshCw, Save, Settings2, Sparkles, Trash2, Upload, X } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  const [aiStats, setAiStats] = useState<{
    total_photos: number
    context_photos_db: number
    indexed_photos_redis: number
    percentage_db: number
    percentage_redis: number
  } | null>(null)
  const [loadingStats, setLoadingStats] = useState(false)
  const [syncingAi, setSyncingAi] = useState(false)
  const [realProjectId, setRealProjectId] = useState<string | null>(null)

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

  const overallProgress = useMemo(() => {
    if (uploadFiles.length === 0) return 0
    const total = uploadFiles.reduce((acc, file) => acc + file.progress, 0)
    return Math.round(total / uploadFiles.length)
  }, [uploadFiles])

  const formattedPhotos = useMemo(
    () => photos.map((photo) => ({
      ...photo,
      src: photo.previewUrl || (photo.originalUrl?.startsWith('http') ? photo.originalUrl : null) || photo.url || photo.previewUrl,
    })),
    [photos]
  )

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
      setLightboxOpen(false)
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

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Đang tải show chụp...
        </div>
      </div>
    )
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
      {isUploading && (
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

          <div className="flex items-center gap-2 lg:hidden">
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
            <Button variant="outline" size="sm" className="h-9 gap-2 sm:h-10 sm:px-4" onClick={() => setConfigOpen(true)}>
              <Settings2 className="h-4 w-4" />
              <span className="hidden sm:inline">Cấu hình</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="overflow-hidden border-none shadow-none bg-transparent">
          <CardContent className="p-0 sm:p-2">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {photos.map((photo, index) => {
                const hasContext = Boolean(photo.aiContext && typeof photo.aiContext === 'object')

                return (
                  <div
                    key={photo.id}
                    className={cn(
                      'group relative aspect-square overflow-hidden rounded-xl bg-muted/80 transition duration-200 hover:-translate-y-0.5 hover:shadow-lg',
                      hasContext ? 'ring-1 ring-emerald-400/20' : 'ring-0'
                    )}
                    onClick={() => {
                      setLightboxIndex(index)
                      setLightboxOpen(true)
                    }}
                  >
                    <img
                      src={photo.previewUrl}
                      alt={photo.filename}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity" />

                    {photo.selected && (
                      <div className="absolute right-2 top-2 z-10">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg">
                          <CheckCircle2 className="h-4 w-4" />
                        </div>
                      </div>
                    )}

                    <div className="absolute inset-0 flex flex-col justify-end p-2 sm:p-3 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                      <div className="flex items-center justify-between gap-2">

                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              openAiSheet(photo)
                            }}
                            className="rounded-md bg-white/90 p-2 text-amber-600 shadow-sm transition hover:bg-white"
                            title="Xem ngữ cảnh Gemini"
                          >
                            <Sparkles className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              setDeletePhotoTarget(photo)
                            }}
                            className="rounded-md bg-white/90 p-2 text-red-600 shadow-sm transition hover:bg-white"
                            title="Xóa ảnh"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1 text-left">
                        <p className="max-w-full truncate text-[11px] font-medium text-white sm:text-xs">
                          {photo.filename}
                        </p>
                        <p className="text-[10px] text-white/70">
                          {hasContext ? 'Đã có ngữ cảnh Gemini' : 'Chưa có ngữ cảnh Gemini'}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {photoCount === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-none border-none px-6 py-16 text-center text-muted-foreground">
                <ImageIcon className="mb-3 h-10 w-10 opacity-30" />
                <p className="text-sm font-medium">Chưa có ảnh nào trong show chụp này</p>
                <p className="mt-1 text-xs">Hãy upload ảnh để bắt đầu.</p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-6">
            <div className="space-y-4">
              <div className="space-y-1 px-1">
                <h2 className="text-lg font-bold tracking-tight">Trạng thái AI</h2>
                <p className="text-xs text-muted-foreground">Kiểm tra mức độ đồng bộ ngữ cảnh.</p>
              </div>

              <Card className="rounded-3xl border bg-primary/5 p-4 shadow-none">
                <div className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
                        <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                        Ngữ cảnh (Database)
                      </span>
                      <span className="font-bold">{aiStats?.context_photos_db ?? 0}/{aiStats?.total_photos ?? 0}</span>
                    </div>
                    <Progress value={aiStats?.percentage_db ?? 0} className="h-1.5 bg-blue-100" />
                    <div className="flex justify-between text-[10px] text-muted-foreground italic">
                      <span>Đã lưu mô tả Gemini</span>
                      <span>{aiStats?.percentage_db ?? 0}%</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Tìm kiếm (Redis)
                      </span>
                      <span className="font-bold">{aiStats?.indexed_photos_redis ?? 0}/{aiStats?.total_photos ?? 0}</span>
                    </div>
                    <Progress value={aiStats?.percentage_redis ?? 0} className="h-1.5 bg-emerald-100" />
                    <div className="flex justify-between text-[10px] text-muted-foreground italic">
                      <span>Sẵn sàng tìm kiếm</span>
                      <span>{aiStats?.percentage_redis ?? 0}%</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      className="w-full h-9 text-xs rounded-xl bg-background hover:bg-muted"
                      onClick={fetchAiStats}
                      disabled={loadingStats || syncingAi}
                    >
                      {loadingStats ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <RefreshCw className="h-3 w-3 mr-2" />}
                      Kiểm tra lại
                    </Button>

                    <Button
                      className="w-full h-9 text-xs rounded-xl bg-amber-500 hover:bg-amber-600 text-white"
                      onClick={async () => {
                        setSyncingAi(true)
                        try {
                          const idToUse = realProjectId || project.id
                          const res = await fetch(`/api/ai-stats/projects/${idToUse}/sync`, { method: 'POST' })
                          if (res.ok) {
                            const data = await res.json()
                            toast.success(`Đã bắt đầu tạo ngữ cảnh cho ${data.queued_count} ảnh!`)
                            // Tự động tải lại stats sau khi bắt đầu
                            setTimeout(fetchAiStats, 2000)
                          } else {
                            toast.error('Không thể bắt đầu tạo ngữ cảnh')
                          }
                        } catch (err) {
                          toast.error('Lỗi kết nối')
                        } finally {
                          setSyncingAi(false)
                        }
                      }}
                      disabled={loadingStats || syncingAi}
                    >
                      {syncingAi ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Sparkles className="h-3 w-3 mr-2" />}
                      Tạo ngữ cảnh AI
                    </Button>
                  </div>
                </div>
              </Card>
            </div>

            <div className="space-y-1 px-1">
              <h2 className="text-lg font-bold tracking-tight">Cấu hình</h2>
              <p className="text-xs text-muted-foreground">Thiết lập các thông số cho show chụp.</p>
            </div>

            <div className="rounded-3xl border bg-muted/30 p-5 space-y-8">
              <div className="space-y-6">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Settings2 className="h-4 w-4 text-primary" />
                    Thông tin show chụp
                  </div>
                  <p className="text-[10px] text-muted-foreground">Cập nhật thông tin cơ bản và trạng thái show.</p>
                </div>

                <div className="grid gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="event-name-side" className="text-[11px] font-medium text-muted-foreground">Tên sự kiện</Label>
                    <Input id="event-name-side" value={eventNameDraft} onChange={e => setEventNameDraft(e.target.value)} className="bg-background" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="client-name-side" className="text-[11px] font-medium text-muted-foreground">Khách hàng</Label>
                    <Input id="client-name-side" value={clientNameDraft} onChange={e => setClientNameDraft(e.target.value)} className="bg-background" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="client-email-side" className="text-[11px] font-medium text-muted-foreground">Email liên hệ</Label>
                    <Input id="client-email-side" type="email" value={clientEmailDraft} onChange={e => setClientEmailDraft(e.target.value)} className="bg-background" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-medium text-muted-foreground">Trạng thái</Label>
                      <Select value={statusDraft} onValueChange={(v: any) => setStatusDraft(v)}>
                        <SelectTrigger className="bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CHOOSING">Đang chọn</SelectItem>
                          <SelectItem value="DONE">Hoàn thành</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="max-selections-side" className="text-[11px] font-medium text-muted-foreground">Giới hạn ảnh</Label>
                      <Input
                        id="max-selections-side"
                        type="number"
                        min={1}
                        value={maxSelectionsDraft}
                        onChange={(event) => setMaxSelectionsDraft(event.target.value)}
                        className="bg-background"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-6 border-t border-dashed">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Upload className="h-4 w-4 text-sky-600" />
                  Tải lên ảnh mới
                </div>
                <Button
                  variant="outline"
                  className="w-full h-24 flex-col gap-2 border-dashed border-2 bg-background/40 hover:bg-background/60"
                  onClick={() => document.getElementById('side-upload')?.click()}
                >
                  <Plus className="h-6 w-6 text-muted-foreground" />
                  <span className="text-xs font-medium">Click để chọn ảnh</span>
                  <input
                    id="side-upload"
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleUploadFiles(e.target.files)}
                  />
                </Button>

                {uploadFiles.length > 0 && (
                  <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                    {uploadFiles.map(file => (
                      <div key={file.id} className="text-[10px] space-y-1.5 p-2.5 rounded-xl bg-background border shadow-sm">
                        <div className="flex justify-between gap-2">
                          <span className="truncate flex-1 font-medium">{file.name}</span>
                          <span className="text-muted-foreground">{file.status === 'complete' ? 'Xong' : `${file.progress}%`}</span>
                        </div>
                        <Progress value={file.progress} className="h-1" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button className="h-12 w-full gap-2 rounded-2xl text-base shadow-xl" onClick={handleSaveConfig} disabled={saving}>
                {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                Lưu cấu hình
              </Button>
            </div>
          </div>
        </aside>
      </div>



      <Sheet open={configOpen} onOpenChange={setConfigOpen}>
        <SheetContent side={isMobile ? 'bottom' : 'right'} className={isMobile ? 'h-[85vh] w-full overflow-y-auto rounded-t-xl border-none px-0' : 'w-full overflow-y-auto sm:max-w-md px-0'}>
          <div className="px-4 pb-8 pt-2 sm:px-6">
            <SheetHeader className="space-y-2 pb-6">
              <SheetTitle className="flex items-center gap-2 text-lg">
                <Settings2 className="h-5 w-5 text-primary" />
                Cấu hình show chụp
              </SheetTitle>
              <SheetDescription>
                Điều chỉnh các thiết lập cho show này.
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    Trạng thái đồng bộ AI
                  </h3>
                  <p className="text-[11px] text-muted-foreground">Kiểm tra dữ liệu ngữ cảnh trong hệ thống.</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 rounded-xl border bg-blue-50/30 p-3">
                    <div className="flex justify-between text-[11px] font-medium">
                      <span>Database</span>
                      <span>{aiStats?.context_photos_db ?? 0}/{aiStats?.total_photos ?? 0}</span>
                    </div>
                    <Progress value={aiStats?.percentage_db ?? 0} className="h-1 bg-blue-200" />
                  </div>

                  <div className="space-y-2 rounded-xl border bg-emerald-50/30 p-3">
                    <div className="flex justify-between text-[11px] font-medium">
                      <span>Redis</span>
                      <span>{aiStats?.indexed_photos_redis ?? 0}/{aiStats?.total_photos ?? 0}</span>
                    </div>
                    <Progress value={aiStats?.percentage_redis ?? 0} className="h-1 bg-emerald-200" />
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-9 text-xs rounded-xl"
                  onClick={fetchAiStats}
                  disabled={loadingStats}
                >
                  {loadingStats ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Sparkles className="h-3 w-3 mr-2 text-amber-500" />}
                  Cập nhật trạng thái mới nhất
                </Button>
              </div>

              <div className="rounded-2xl border bg-muted/30 p-4 space-y-6">
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
                    className="w-full h-24 flex-col gap-2 border-dashed border-2 bg-background/50"
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

                  {uploadFiles.length > 0 && (
                    <div className="space-y-2">
                      {uploadFiles.map(file => (
                        <div key={file.id} className="text-xs space-y-1.5 p-3 rounded-xl bg-background border shadow-sm">
                          <div className="flex justify-between gap-2">
                            <span className="truncate font-medium">{file.name}</span>
                            <span className="text-muted-foreground">{file.status === 'complete' ? 'Thành công' : `${file.progress}%`}</span>
                          </div>
                          <Progress value={file.progress} className="h-1.5" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Button className="h-12 w-full gap-2 rounded-xl text-base shadow-lg" onClick={handleSaveConfig} disabled={saving}>
                  {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                  Lưu cấu hình
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <StudioLightbox
        photos={formattedPhotos}
        currentIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onNavigate={setLightboxIndex}
        onDelete={(photo) => {
          const target = photos.find((item) => item.id === photo.id) ?? null
          setDeletePhotoTarget(target)
          setLightboxOpen(false)
        }}
      />

      <AIInsightSheet
        photo={aiPhoto}
        open={aiSheetOpen}
        onOpenChange={setAiSheetOpen}
      />

      <AlertDialog open={Boolean(deletePhotoTarget)} onOpenChange={(open) => !open && setDeletePhotoTarget(null)}>
        <AlertDialogContent>
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
