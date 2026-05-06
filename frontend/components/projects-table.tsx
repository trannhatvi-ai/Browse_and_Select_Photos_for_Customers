'use client'

import { useEffect, useState } from 'react'
import { Eye, MoreHorizontal, Download, Link as LinkIcon, Upload, Image as ImageIcon, Trash2 } from 'lucide-react'
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

interface ProjectsTableProps {
  projects: Project[]
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('vi-VN', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  })
}

export function ProjectsTable({ projects }: ProjectsTableProps) {
  const [visibleProjects, setVisibleProjects] = useState<Project[]>(projects)
  const [selectedProject, setSelectedProject] = useState<any>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [savingProjectSettings, setSavingProjectSettings] = useState(false)
  const [maxSelectionsDraft, setMaxSelectionsDraft] = useState('')
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null)
  const [deletePhotoTarget, setDeletePhotoTarget] = useState<{ photoId: string; filename: string } | null>(null)

  useEffect(() => {
    setVisibleProjects(projects)
  }, [projects])

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
      toast.error('Không thể tải thông tin dự án')
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
      setVisibleProjects((current) =>
        current.map((project) =>
          project.id === updatedProject.id
            ? { ...project, maxSelections: updatedProject.maxSelections }
            : project,
        ),
      )
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

    setUploading(true)
    setUploadProgress(10)

    const formData = new FormData()
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i])
    }

    try {
      setUploadProgress(40)
      const res = await fetch(`/api/projects/${selectedProject.id}/photos`, {
        method: 'POST',
        body: formData,
      })

      if (res.ok) {
        setUploadProgress(100)
        toast.success(`Đã tải lên ${files.length} ảnh thành công!`)
        // Reload project data
        const detailRes = await fetch(`/api/projects/${selectedProject.id}/details`)
        if (detailRes.ok) setSelectedProject(await detailRes.json())
      } else {
        toast.error('Upload thất bại!')
      }
    } catch {
      toast.error('Lỗi kết nối khi upload!')
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const handleDeleteProject = async (projectId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Đã xóa dự án!')
        setVisibleProjects((current) => current.filter((project) => project.id !== projectId))
        if (selectedProject?.id === projectId) {
          setDialogOpen(false)
          setSelectedProject(null)
        }
      } else {
        toast.error('Xóa thất bại!')
      }
    } catch {
      toast.error('Lỗi kết nối!')
    }
  }

  return (
    <>
      {/* Desktop Table */}
      <div className="hidden md:block rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Khách hàng</TableHead>
              <TableHead>Sự kiện</TableHead>
              <TableHead>Ngày</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Hạn chót</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleProjects.map((project) => (
              <TableRow key={project.id} className="group transition-colors hover:bg-muted/50">
                <TableCell className="font-medium">{project.clientName}</TableCell>
                <TableCell>{project.eventName}</TableCell>
                <TableCell className="text-muted-foreground">{formatDate(project.eventDate)}</TableCell>
                <TableCell>
                  <Select
                    defaultValue={project.status}
                    onValueChange={async (value) => {
                      await fetch(`/api/projects/${project.id}`, {
                        method: 'PATCH',
                        body: JSON.stringify({ status: value }),
                      })
                      toast.success('Đã cập nhật trạng thái!')
                      window.location.reload()
                    }}
                  >
                    <SelectTrigger className="w-[130px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CHOOSING">Khách chọn</SelectItem>
                      <SelectItem value="DONE">Hoàn thành</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-muted-foreground">{formatDate(project.deadline)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <Button
                      variant="outline" size="icon" className="h-8 w-8"
                      title="Copy link gửi khách"
                      onClick={() => {
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
                        const res = await fetch(`/api/projects/${project.id}/export`)
                        if (!res.ok) return toast.error('Không có ảnh nào được chọn!')
                        const blob = await res.blob()
                        const url = window.URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = url
                        a.download = `Selected_Photos_${project.clientName}.txt`
                        a.click()
                        toast.success('Đã tải xuống danh sách!')
                      }}
                    >
                      <Download className="h-4 w-4" />
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
                          <Trash2 className="mr-2 h-4 w-4" /> Xóa dự án
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card Layout */}
      <div className="md:hidden space-y-3">
            {visibleProjects.map((project) => (
          <Card key={project.id} className="overflow-hidden">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold truncate">{project.eventName}</h3>
                  <p className="text-sm text-muted-foreground truncate">{project.clientName}</p>
                </div>
                <Select
                  defaultValue={project.status}
                  onValueChange={async (value) => {
                    await fetch(`/api/projects/${project.id}`, {
                      method: 'PATCH',
                      body: JSON.stringify({ status: value }),
                    })
                    toast.success('Đã cập nhật!')
                    window.location.reload()
                  }}
                >
                  <SelectTrigger className="w-[120px] h-7 text-xs ml-2 shrink-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CHOOSING">Khách chọn</SelectItem>
                    <SelectItem value="DONE">Hoàn thành</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>Ngày: {formatDate(project.eventDate)}</span>
                <span>Hạn: {formatDate(project.deadline)}</span>
              </div>
              <div className="flex items-center gap-2 pt-1 border-t">
                <Button variant="outline" size="sm" className="flex-1 h-8 text-xs"
                  onClick={() => {
                    const url = `${window.location.origin}/gallery/${project.accessToken}`
                    navigator.clipboard.writeText(url)
                    toast.success('Đã copy link!')
                  }}
                >
                  <LinkIcon className="mr-1 h-3 w-3" /> Copy link
                </Button>
                <Button variant="default" size="sm" className="flex-1 h-8 text-xs"
                  onClick={() => handleViewProject(project.id)}
                >
                  <Eye className="mr-1 h-3 w-3" /> Xem
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-destructive"
                  onClick={() => setDeleteProjectId(project.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Project Detail Dialog (Popup) */}
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
              ) : 'Đang tải thông tin dự án...'}
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
                      Thay đổi giới hạn ảnh khách được phép chọn cho dự án này.
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
                  {uploading && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Đang tải lên...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <Progress value={uploadProgress} className="h-1.5" />
                    </div>
                  )}
                </div>

                {/* Photos Grid */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm">
                    Ảnh trong dự án ({selectedProject.photos?.length || 0})
                  </h3>
                  {selectedProject.photos?.length > 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
                      {selectedProject.photos.map((photo: any) => (
                        <div key={photo.id} className="group relative aspect-square bg-muted rounded-lg overflow-hidden">
                          <img src={photo.previewUrl} alt={photo.filename} className="object-cover w-full h-full transition-transform group-hover:scale-105" />
                          {photo.selected && (
                            <div className="absolute top-1.5 right-1.5 bg-green-500 text-white p-1 rounded-full shadow-md">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
                            </div>
                          )}
                          {/* Delete + info overlay */}
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                            <button
                              onClick={() => setDeletePhotoTarget({ photoId: photo.id, filename: photo.filename })}
                              className="bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
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
        </DialogContent>
      </Dialog>

        <AlertDialog open={Boolean(deleteProjectId)} onOpenChange={(open) => !open && setDeleteProjectId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Xóa dự án?</AlertDialogTitle>
              <AlertDialogDescription>
                Hành động này sẽ xóa toàn bộ dự án, ảnh và dữ liệu liên quan. Không thể hoàn tác.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Hủy</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (deleteProjectId) {
                    handleDeleteProject(deleteProjectId)
                    setDeleteProjectId(null)
                  }
                }}
              >
                Xóa
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={Boolean(deletePhotoTarget)} onOpenChange={(open) => !open && setDeletePhotoTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Xóa ảnh này?</AlertDialogTitle>
              <AlertDialogDescription>
                Ảnh <strong>{deletePhotoTarget?.filename}</strong> sẽ bị xóa khỏi dự án.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Hủy</AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  if (!selectedProject || !deletePhotoTarget) return
                  const res = await fetch(`/api/projects/${selectedProject.id}/photos`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ photoId: deletePhotoTarget.photoId })
                  })
                  if (res.ok) {
                    toast.success('Đã xóa ảnh!')
                    const r = await fetch(`/api/projects/${selectedProject.id}/details`)
                    if (r.ok) setSelectedProject(await r.json())
                  } else {
                    toast.error('Xóa thất bại!')
                  }
                  setDeletePhotoTarget(null)
                }}
              >
                Xóa
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </>
  )
}
