'use client'

import { useEffect, useState, useMemo } from 'react'
import { Eye, MoreHorizontal, Download, Link as LinkIcon, Upload, Image as ImageIcon, Trash2, ArrowUpDown, Search, SlidersHorizontal, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { Project } from '@/lib/types'
import { StudioLightbox } from '@/components/studio-lightbox'

interface ProjectsTableProps {
  projects: any[]
  onRefresh?: () => void
}

interface UploadFile {
  id: string
  name: string
  progress: number
  status: 'pending' | 'uploading' | 'complete' | 'error'
  file: File
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('vi-VN', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  })
}

type SortKey = keyof Project

export function ProjectsTable({ projects: initialProjects, onRefresh }: ProjectsTableProps) {
  // Shared UI state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProject, setSelectedProject] = useState<any>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [savingProjectSettings, setSavingProjectSettings] = useState(false)
  const [maxSelectionsDraft, setMaxSelectionsDraft] = useState('')
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null)
  const [deletePhotoTarget, setDeletePhotoTarget] = useState<{ photoId: string; filename: string } | null>(null)
  const [exportLoadingIds, setExportLoadingIds] = useState<string[]>([])
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([])
  const [syncingIds, setSyncingIds] = useState<string[]>([])

  // Desktop-only state
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'eventDate', direction: 'desc' })

  // Filter & Sort
  const processedProjects = useMemo(() => {
    let result = [...initialProjects]

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(p =>
        p.clientName?.toLowerCase().includes(q) ||
        p.eventName?.toLowerCase().includes(q)
      )
    }

    // Status filter
    if (statusFilter !== 'ALL') {
      result = result.filter(p => p.status === statusFilter)
    }

    // Sort
    if (sortConfig.key) {
      result.sort((a, b) => {
        const aVal = a[sortConfig.key as keyof Project]
        const bVal = b[sortConfig.key as keyof Project]

        if (!aVal && !bVal) return 0
        if (!aVal) return 1
        if (!bVal) return -1

        // Date sorting
        if (sortConfig.key === 'eventDate' || sortConfig.key === 'deadline') {
          return sortConfig.direction === 'asc'
            ? new Date(aVal as string).getTime() - new Date(bVal as string).getTime()
            : new Date(bVal as string).getTime() - new Date(aVal as string).getTime()
        }

        // String sorting
        const aStr = String(aVal).toLowerCase()
        const bStr = String(bVal).toLowerCase()
        if (aStr < bStr) return sortConfig.direction === 'asc' ? -1 : 1
        if (aStr > bStr) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    }

    return result
  }, [initialProjects, searchQuery, statusFilter, sortConfig])

  const handleSort = (key: SortKey) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  const SortHeader = ({ column, label }: { column: SortKey; label: string }) => (
    <button
      onClick={() => handleSort(column)}
      className="flex items-center gap-1 hover:text-foreground transition-colors"
    >
      {label}
      <ArrowUpDown className={cn(
        "h-4 w-4",
        sortConfig.key === column ? "text-foreground" : "text-muted-foreground/50"
      )} />
      {sortConfig.key === column && (
        <span className="text-xs text-muted-foreground">
          {sortConfig.direction === 'asc' ? '↑' : '↓'}
        </span>
      )}
    </button>
  )

  const handleViewProject = async (projectId: string) => {
    setDialogOpen(true)
    setLoadingDetail(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/details`)
      if (res.ok) {
        const data = await res.json()
        setSelectedProject(data)
        setMaxSelectionsDraft(String(data.maxSelections ?? 50))
      }
    } catch {
      toast.error('Không thể tải thông tin show chụp')
    } finally {
      setLoadingDetail(false)
    }
  }

  const handleSaveMaxSelections = async () => {
    if (!selectedProject) return

    const parsedMaxSelections = Number(maxSelectionsDraft)
    if (!Number.isInteger(parsedMaxSelections) || parsedMaxSelections < 1) {
      toast.error('Số ảnh tối đa phải là số nguyên lớn hơn 0')
      return
    }

    setSavingProjectSettings(true)
    try {
      const res = await fetch(`/api/projects/${selectedProject.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxSelections: parsedMaxSelections }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || 'Không thể cập nhật số ảnh tối đa')
      }

      const updatedProject = await res.json()
      setSelectedProject((current: any) => ({ ...current, ...updatedProject }))
      toast.success('Đã cập nhật số ảnh tối đa!')
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setSavingProjectSettings(false)
    }
  }

  const handleUploadInDialog = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0 || !selectedProject) return

    const newFiles: UploadFile[] = Array.from(files).map((file, i) => ({
      id: `${Date.now()}-${i}`,
      name: file.name,
      progress: 0,
      status: 'pending',
      file,
    }))

    setUploadFiles(prev => [...prev, ...newFiles])
    setUploading(true)

    const allUploadedPhotos: any[] = []

    // Upload từng file một nhưng cập nhật progress riêng biệt
    for (const fileItem of newFiles) {
      const formData = new FormData()
      formData.append('files', fileItem.file)

      setUploadFiles(prev => prev.map(f => f.id === fileItem.id ? { ...f, status: 'uploading' } : f))

      try {
        const xhr = new XMLHttpRequest()
        const uploadPromise = new Promise((resolve, reject) => {
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const percent = Math.round((event.loaded / event.total) * 95)
              setUploadFiles(prev => prev.map(f => f.id === fileItem.id ? { ...f, progress: percent } : f))
            }
          }
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) resolve(JSON.parse(xhr.responseText))
            else reject(new Error(xhr.responseText))
          }
          xhr.onerror = () => reject(new Error('Network error'))
          xhr.open('POST', `/api/projects/${selectedProject.id}/photos`)
          xhr.send(formData)
        })

        const result: any = await uploadPromise
        if (result.photos) {
          allUploadedPhotos.push(...result.photos)
        }
        setUploadFiles(prev => prev.map(f => f.id === fileItem.id ? { ...f, status: 'complete', progress: 100 } : f))
      } catch (err) {
        console.error(`Failed to upload ${fileItem.name}:`, err)
        setUploadFiles(prev => prev.map(f => f.id === fileItem.id ? { ...f, status: 'error' } : f))
      }
    }

    // Sau khi tất cả đã upload xong, gọi AI Indexing 1 lần duy nhất (Không await để không chặn UI)
    if (allUploadedPhotos.length > 0) {
      fetch(`${process.env.NEXT_PUBLIC_AI_BACKEND_URL || 'http://localhost:8000'}/index`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: selectedProject.id,
          urls: allUploadedPhotos.map(p => p.previewUrl),
          rebuild: false,
          project_created_at: selectedProject.createdAt
        })
      }).catch(err => console.error('Failed to trigger AI indexing batch:', err))
    }

    // Cập nhật lại data dự án
    try {
      const detailRes = await fetch(`/api/projects/${selectedProject.id}/details`)
      if (detailRes.ok) {
        const updated = await detailRes.json()
        setSelectedProject(updated)
      }
    } catch (e) {
      console.error('Failed to refresh project details:', e)
    } finally {
      // Giữ danh sách file 2 giây để người dùng thấy trạng thái "Xong" rồi mới ẩn
      setTimeout(() => {
        setUploadFiles([])
        setUploading(false)
      }, 2000)
    }
  }

  const [isDeleting, setIsDeleting] = useState(false)

  const handleDeleteProject = async (projectId: string) => {
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/projects/${projectId}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Đã xóa show chụp!')
        setDeleteProjectId(null) // Close the confirmation dialog
        if (onRefresh) onRefresh() 
        if (selectedProject?.id === projectId) {
          setDialogOpen(false)
          setSelectedProject(null)
        }
      } else {
        toast.error('Xóa thất bại!')
      }
    } catch {
      toast.error('Lỗi kết nối!')
    } finally {
      setIsDeleting(false)
    }
  }

  // Filter by search (shared)
  const filteredBySearch = useMemo(() => {
    if (!searchQuery.trim()) return initialProjects
    const q = searchQuery.toLowerCase()
    return initialProjects.filter(p =>
      p.clientName?.toLowerCase().includes(q) ||
      p.eventName?.toLowerCase().includes(q)
    )
  }, [initialProjects, searchQuery])

  // Desktop: filter by status + sort
  const desktopProjects = useMemo(() => {
    let result = [...filteredBySearch]

    // Status filter
    if (statusFilter !== 'ALL') {
      result = result.filter(p => p.status === statusFilter)
    }

    // Sort
    if (sortConfig.key) {
      result.sort((a, b) => {
        const aVal = a[sortConfig.key as keyof Project]
        const bVal = b[sortConfig.key as keyof Project]

        if (!aVal && !bVal) return 0
        if (!aVal) return 1
        if (!bVal) return -1

        if (sortConfig.key === 'eventDate' || sortConfig.key === 'deadline' || sortConfig.key === 'createdAt') {
          return sortConfig.direction === 'asc'
            ? new Date(aVal as string).getTime() - new Date(bVal as string).getTime()
            : new Date(bVal as string).getTime() - new Date(aVal as string).getTime()
        }

        const aStr = String(aVal).toLowerCase()
        const bStr = String(bVal).toLowerCase()
        if (aStr < bStr) return sortConfig.direction === 'asc' ? -1 : 1
        if (aStr > bStr) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    }

    return result
  }, [filteredBySearch, statusFilter, sortConfig])

  return (
    <>
      {/* Desktop Table */}
      <div className="hidden md:block rounded-lg border border-border bg-card">
        {/* Toolbar */}
        <div className="flex items-center justify-between p-4 border-b gap-4 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm show chụp..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px] h-10">
                <SelectValue placeholder="Lọc trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
                <SelectItem value="CHOOSING">Khách chọn</SelectItem>
                <SelectItem value="DONE">Hoàn thành</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">
                  <SortHeader column="clientName" label="Khách hàng" />
                </TableHead>
                <TableHead className="w-[200px]">
                  <SortHeader column="eventName" label="Sự kiện" />
                </TableHead>
                <TableHead className="w-[120px]">
                  <SortHeader column="eventDate" label="Ngày" />
                </TableHead>
                <TableHead className="w-[140px]">
                  <SortHeader column="status" label="Trạng thái" />
                </TableHead>
                <TableHead className="w-[120px]">
                  <SortHeader column="deadline" label="Hạn chót" />
                </TableHead>
                <TableHead className="w-[100px] text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {desktopProjects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    Không tìm thấy show chụp nào
                  </TableCell>
                </TableRow>
              ) : (
                desktopProjects.map((project) => (
                  <TableRow key={project.id} className="group transition-colors hover:bg-muted/50">
                    <TableCell className="font-medium truncate max-w-[180px]">{project.clientName}</TableCell>
                    <TableCell className="truncate max-w-[200px]">{project.eventName}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(project.eventDate)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={project.status === 'DONE' ? 'default' : 'secondary'}
                        className={cn(
                          'font-medium',
                          project.status === 'CHOOSING' && 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/20',
                          project.status === 'DONE' && 'bg-green-500/10 text-green-600 hover:bg-green-500/20'
                        )}
                      >
                        {project.status === 'CHOOSING' ? 'Khách chọn' : 'Hoàn thành'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(project.deadline)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline" size="icon" className="h-8 w-8"
                          title="Copy link gửi khách"
                          onClick={() => {
                            if (!project.accessToken) return
                            const url = `${window.location.origin}/gallery/${project.accessToken}`
                            navigator.clipboard.writeText(url)
                            toast.success('Đã copy link gallery!')
                          }}
                        >
                          <LinkIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="default" size="icon"
                          className="h-8 w-8 bg-green-600 hover:bg-green-700"
                          title="Tải danh sách ảnh khách chọn"
                          onClick={async () => {
                            if (exportLoadingIds.includes(project.id)) return
                            setExportLoadingIds(prev => [...prev, project.id])
                            try {
                              const res = await fetch(`/api/projects/${project.id}/export`)
                              if (!res.ok) return toast.error('Không có ảnh nào được chọn!')
                              const blob = await res.blob()
                              const url = window.URL.createObjectURL(blob)
                              const a = document.createElement('a')
                              a.href = url
                              a.download = `Selected_Photos_${project.clientName}.txt`
                              a.click()
                              toast.success('Đã tải xuống danh sách!')
                            } catch (e) {
                              toast.error('Lỗi khi tải xuống')
                            } finally {
                              setExportLoadingIds(prev => prev.filter(id => id !== project.id))
                            }
                          }}
                        >
                          {exportLoadingIds.includes(project.id) ? (
                            <div className="h-4 w-4 rounded-full border-b-2 border-white animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleViewProject(project.id)}>
                          <Eye className="mr-1.5 h-4 w-4" /> Xem
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setDeleteProjectId(project.id)} className="text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" /> Xóa show chụp
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Mobile Card Layout */}
      <div className="md:hidden space-y-3">
        {filteredBySearch.map((project) => (
          <Card key={project.id} className="overflow-hidden">
            <CardContent className="p-4 space-y-3">
              {/* Top row: Client Name + Status Badge */}
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{project.clientName}</h3>
                </div>
                <span
                  className={cn(
                    'px-2 py-1 rounded-full text-xs font-medium shrink-0',
                    project.status === 'CHOOSING'
                      ? 'bg-amber-500/10 text-amber-600'
                      : 'bg-green-500/10 text-green-600'
                  )}
                >
                  {project.status === 'CHOOSING' ? 'Khách chọn' : 'Hoàn thành'}
                </span>
              </div>

              {/* Middle row: Event Name */}
              <p className="text-sm text-muted-foreground truncate">{project.eventName}</p>

              {/* Bottom row: Deadline + Quick Actions */}
              <div className="flex items-center justify-between pt-2 border-t">
                <div className="text-xs text-muted-foreground">
                  Hạn: {formatDate(project.deadline)}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-11 px-3 text-sm"
                    onClick={() => handleViewProject(project.id)}
                  >
                    <Eye className="mr-1 h-4 w-4" /> Xem
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-11 px-3 text-sm"
                    title="Copy link gửi khách"
                    onClick={() => {
                      if (!project.accessToken) return toast.error('Không có link show chụp')
                      const url = `${window.location.origin}/gallery/${project.accessToken}`
                      navigator.clipboard.writeText(url)
                      toast.success('Đã copy link gallery!')
                    }}
                  >
                    <LinkIcon className="mr-1 h-4 w-4" /> Sao chép
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    className="h-11 px-3 text-sm"
                    onClick={async () => {
                      if (exportLoadingIds.includes(project.id)) return
                      setExportLoadingIds(prev => [...prev, project.id])
                      try {
                        const res = await fetch(`/api/projects/${project.id}/export`)
                        if (!res.ok) return toast.error('Không có ảnh nào được chọn!')
                        const blob = await res.blob()
                        const url = window.URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = url
                        a.download = `Selected_Photos_${project.clientName}.txt`
                        a.click()
                        toast.success('Đã tải xuống danh sách!')
                      } catch (e) {
                        toast.error('Lỗi khi tải xuống')
                      } finally {
                        setExportLoadingIds(prev => prev.filter(id => id !== project.id))
                      }
                    }}
                  >
                    {exportLoadingIds.includes(project.id) ? (
                      <div className="mr-1 h-4 w-4 rounded-full border-b-2 border-white animate-spin" />
                    ) : (
                      <Download className="mr-1 h-4 w-4" />
                    )} Tải
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Project Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="!w-[96vw] !max-w-[1200px] max-h-[95vh] p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle className="text-xl">
              {selectedProject?.eventName || 'Đang tải...'}
            </DialogTitle>
            <DialogDescription>
              {selectedProject ? (
                <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  <span>Khách: <strong>{selectedProject.clientName}</strong></span>
                  <span className="text-muted-foreground">•</span>
                  <span>Email: {selectedProject.clientEmail}</span>
                  <span className="text-muted-foreground">•</span>
                  <span>Mã: <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">{selectedProject.accessToken}</code></span>
                </span>
              ) : 'Đang tải thông tin show chụp...'}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[calc(90vh-130px)]">
            {loadingDetail ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : selectedProject ? (
              <div className="p-6 space-y-6">
                {/* Stats Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-lg bg-muted/50 p-3 text-center">
                    <p className="text-2xl font-bold">{selectedProject.photos?.length || 0}</p>
                    <p className="text-xs text-muted-foreground">Tổng ảnh</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3 text-center">
                    <p className="text-2xl font-bold text-green-600">{selectedProject.photos?.filter((p: any) => p.selected).length || 0}</p>
                    <p className="text-xs text-muted-foreground">Đã chọn</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3 text-center">
                    <p className="text-2xl font-bold">{selectedProject.maxSelections}</p>
                    <p className="text-xs text-muted-foreground">Tối đa</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3 text-center">
                    <p className="text-2xl font-bold">{selectedProject.status}</p>
                    <p className="text-xs text-muted-foreground">Trạng thái</p>
                  </div>
                </div>

                {/* Edit max selections */}
                <div className="rounded-lg border bg-card p-4 space-y-3">
                  <div className="space-y-1">
                    <h3 className="font-semibold text-sm">Chỉnh số ảnh tối đa</h3>
                    <p className="text-xs text-muted-foreground">
                      Thay đổi giới hạn ảnh khách được phép chọn cho show chụp này.
                    </p>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <div className="space-y-2 flex-1">
                      <label className="text-sm font-medium">Số ảnh tối đa</label>
                      <Input
                        type="number"
                        min={1}
                        max={500}
                        value={maxSelectionsDraft}
                        onChange={(e) => setMaxSelectionsDraft(e.target.value)}
                      />
                    </div>
                    <Button
                      type="button"
                      onClick={handleSaveMaxSelections}
                      disabled={savingProjectSettings}
                      className="sm:min-w-[160px]"
                    >
                      {savingProjectSettings ? 'Đang lưu...' : 'Lưu số ảnh tối đa'}
                    </Button>
                  </div>
                </div>

                {/* Upload Section */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm">Thêm ảnh mới</h3>
                  <div className="border-2 border-dashed rounded-lg p-6 text-center hover:bg-muted/50 transition-colors relative">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      onChange={handleUploadInDialog}
                      disabled={uploading}
                    />
                    <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm font-medium">Nhấn để chọn hoặc kéo thả ảnh</p>
                    <p className="text-xs text-muted-foreground mt-1">JPG, PNG • Chọn nhiều ảnh cùng lúc</p>
                  </div>
                  {uploadFiles.length > 0 && (
                    <div className="space-y-2 max-h-[200px] overflow-y-auto pt-2">
                      {uploadFiles.map(file => (
                        <div key={file.id} className="flex items-center gap-2 rounded-md border p-2 bg-muted/30">
                          <ImageIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[11px] font-medium">{file.name}</p>
                            {file.status === 'uploading' && (
                              <Progress value={file.progress} className="mt-1 h-1" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] text-muted-foreground">
                              {file.status === 'complete' ? (
                                <span className="text-green-500 font-bold">✓</span>
                              ) : file.status === 'uploading' ? (
                                `${file.progress}%`
                              ) : file.status === 'error' ? (
                                <span className="text-red-500">Lỗi</span>
                              ) : (
                                <span className="opacity-50 text-[9px] uppercase">Đang chờ</span>
                              )}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Photos Grid */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm">
                    Ảnh trong show chụp ({selectedProject.photos?.length || 0})
                  </h3>
                  {selectedProject.photos?.length > 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
                      {selectedProject.photos.map((photo: any, index: number) => (
                        <div 
                          key={photo.id} 
                          className="group relative aspect-square bg-muted rounded-lg overflow-hidden cursor-pointer"
                          onClick={() => {
                            setLightboxIndex(index)
                            setLightboxOpen(true)
                          }}
                        >
                          <img src={photo.previewUrl} alt={photo.filename} className="object-cover w-full h-full transition-transform group-hover:scale-105" />
                          {photo.selected && (
                            <div className="absolute top-1.5 right-1.5 bg-green-500 text-white p-1 rounded-full shadow-md z-10">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
                            </div>
                          )}
                          <div 
                            className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2"
                          >
                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setDeletePhotoTarget({ photoId: photo.id, filename: photo.filename })
                                }}
                                className="bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 transition-colors"
                                title="Xóa ảnh"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                              <div className="bg-white/20 hover:bg-white/40 text-white rounded-full p-1.5 transition-colors">
                                <Eye className="h-4 w-4" />
                              </div>
                            </div>
                            <p className="text-[10px] text-white truncate max-w-full px-1">{photo.filename}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-12 text-center text-muted-foreground rounded-lg border border-dashed">
                      <ImageIcon className="mx-auto h-10 w-10 mb-2 opacity-50" />
                      <p className="text-sm">Chưa có ảnh nào</p>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </ScrollArea>
          
          <StudioLightbox
            photos={(selectedProject?.photos || []).map((p: any) => ({
              ...p,
              src: p.previewUrl || (p.originalUrl?.startsWith('http') ? p.originalUrl : null) || p.url
            }))}
            currentIndex={lightboxIndex}
            isOpen={lightboxOpen}
            onClose={() => setLightboxOpen(false)}
            onNavigate={setLightboxIndex}
            onDelete={(photo) => {
              setDeletePhotoTarget({ photoId: photo.id, filename: photo.filename })
              setLightboxOpen(false)
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={Boolean(deleteProjectId)} onOpenChange={(open) => !open && setDeleteProjectId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa show chụp?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này sẽ xóa toàn bộ show chụp, ảnh và dữ liệu liên quan. Không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              disabled={isDeleting}
              onClick={(e) => {
                e.preventDefault() // Ngăn đóng dialog tự động
                if (deleteProjectId) {
                  handleDeleteProject(deleteProjectId)
                }
              }}
            >
              {isDeleting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Đang xóa...</>
              ) : (
                'Xóa'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(deletePhotoTarget)} onOpenChange={(open) => !open && setDeletePhotoTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa ảnh này?</AlertDialogTitle>
            <AlertDialogDescription>
              Ảnh <strong>{deletePhotoTarget?.filename}</strong> sẽ bị xóa khỏi show chụp.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              disabled={isDeleting}
              onClick={async (e) => {
                e.preventDefault()
                if (!selectedProject || !deletePhotoTarget) return
                setIsDeleting(true)
                try {
                  const res = await fetch(`/api/projects/${selectedProject.id}/photos`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ photoId: deletePhotoTarget.photoId })
                  })
                  if (res.ok) {
                    toast.success('Đã xóa ảnh!')
                    const r = await fetch(`/api/projects/${selectedProject.id}/details`)
                    if (r.ok) setSelectedProject(await r.json())
                    setDeletePhotoTarget(null)
                  } else {
                    toast.error('Xóa thất bại!')
                  }
                } catch {
                  toast.error('Lỗi kết nối!')
                } finally {
                  setIsDeleting(false)
                }
              }}
            >
              {isDeleting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Đang xóa...</>
              ) : (
                'Xóa'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
