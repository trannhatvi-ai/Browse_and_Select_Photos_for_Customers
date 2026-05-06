'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Plus, Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { ProjectsTable } from '@/components/projects-table'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface UploadFile {
  id: string
  name: string
  progress: number
  status: 'pending' | 'uploading' | 'complete' | 'error'
  file: File
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([])
  const [sheetOpen, setSheetOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const autoEmailNameRef = useRef('')

  // Form state
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [eventName, setEventName] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [maxSelections, setMaxSelections] = useState('50')
  const [deadline, setDeadline] = useState('')
  const [allowDownload, setAllowDownload] = useState(false)
  const [watermarkOpacity, setWatermarkOpacity] = useState([30])

  // Upload state
  const [isDragging, setIsDragging] = useState(false)
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([])

  useEffect(() => {
    fetch('/api/projects')
      .then(res => res.ok ? res.json() : [])
      .then(data => setProjects(Array.isArray(data) ? data : []))
      .catch(() => setProjects([]))
  }, [])

  useEffect(() => {
    const matchedProject = projects.find(
      (project) => project.clientName?.trim().toLowerCase() === clientName.trim().toLowerCase()
    )

    if (!matchedProject) {
      autoEmailNameRef.current = ''
      return
    }

    if (!clientEmail || autoEmailNameRef.current === matchedProject.clientName) {
      setClientEmail(matchedProject.clientEmail)
      autoEmailNameRef.current = matchedProject.clientName
    }
  }, [clientName, clientEmail, projects])

  const resetForm = () => {
    setClientName('')
    setClientEmail('')
    setEventName('')
    setEventDate('')
    setMaxSelections('50')
    setDeadline('')
    setAllowDownload(false)
    setWatermarkOpacity([30])
    setUploadFiles([])
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))
    addFiles(files)
  }, [])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : []
    addFiles(files)
  }

  const addFiles = (files: File[]) => {
    const newFiles: UploadFile[] = files.map((file, i) => ({
      id: `${Date.now()}-${i}`,
      name: file.name,
      progress: 0,
      status: 'pending',
      file,
    }))
    setUploadFiles(prev => [...prev, ...newFiles])
  }

  const removeFile = (id: string) => {
    setUploadFiles(prev => prev.filter(f => f.id !== id))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return
    setIsSubmitting(true)

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName,
          clientEmail,
          eventName,
          eventDate,
          deadline,
          maxSelections: parseInt(maxSelections, 10),
          watermarkConfig: { allowDownload, opacity: watermarkOpacity[0] }
        })
      })

      if (!res.ok) throw new Error('Failed to create project')
      const project = await res.json()

      // Upload files
      const filesToUpload = uploadFiles.filter(f => f.status !== 'complete')
      for (const fileItem of filesToUpload) {
        const formData = new FormData()
        formData.append('files', fileItem.file)

        setUploadFiles(prev => prev.map(f => f.id === fileItem.id ? { ...f, status: 'uploading', progress: 50 } : f))

        const uploadRes = await fetch(`/api/projects/${project.id}/photos`, {
          method: 'POST',
          body: formData
        })

        if (uploadRes.ok) {
          setUploadFiles(prev => prev.map(f => f.id === fileItem.id ? { ...f, status: 'complete', progress: 100 } : f))
        } else {
          setUploadFiles(prev => prev.map(f => f.id === fileItem.id ? { ...f, status: 'error' } : f))
        }
      }

      toast.success('Tạo dự án thành công! Link sẽ được gửi đến khách hàng.')
      resetForm()
      setSheetOpen(false)
      window.location.reload()
    } catch (err) {
      toast.error('Có lỗi xảy ra: ' + (err as Error).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Tất cả dự án</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Xem và quản lý tất cả dự án chọn ảnh của bạn
          </p>
        </div>
        <Button onClick={() => setSheetOpen(true)} className="shrink-0">
          <Plus className="mr-2 h-4 w-4" />
          Dự án mới
        </Button>
      </div>

      <ProjectsTable projects={projects} />

      {/* New Project Sheet (Right Sidebar) */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full !sm:max-w-lg p-0 flex flex-col" style={{ maxWidth: '32rem' }}>
          <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0">
            <SheetTitle>Tạo dự án mới</SheetTitle>
            <SheetDescription>
              Nhập thông tin khách hàng và tải ảnh lên
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto">
            <form id="new-project-form" onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Client Info */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Thông tin khách hàng</h3>
                <div className="space-y-2">
                  <Label htmlFor="s-clientName">Tên khách hàng</Label>
                  <Input id="s-clientName" value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Nguyễn Văn A" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="s-clientEmail">Email</Label>
                  <Input id="s-clientEmail" type="email" value={clientEmail} onChange={e => { autoEmailNameRef.current = ''; setClientEmail(e.target.value) }} placeholder="email@example.com" required />
                </div>
              </div>

              <Separator />

              {/* Project Details */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Chi tiết dự án</h3>
                <div className="space-y-2">
                  <Label htmlFor="s-eventName">Tên sự kiện</Label>
                  <Input id="s-eventName" value={eventName} onChange={e => setEventName(e.target.value)} placeholder="Lễ cưới" required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="s-eventDate">Ngày sự kiện</Label>
                    <Input id="s-eventDate" type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="s-deadline">Hạn chọn ảnh</Label>
                    <Input id="s-deadline" type="date" value={deadline} onChange={e => setDeadline(e.target.value)} required />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Selection Settings */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Cài đặt</h3>
                <div className="space-y-2">
                  <Label htmlFor="s-maxSelections">Số ảnh tối đa</Label>
                  <Input id="s-maxSelections" type="number" min="1" max="500" value={maxSelections} onChange={e => setMaxSelections(e.target.value)} required />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="s-allowDownload" className="text-sm">Cho phép tải ảnh có watermark</Label>
                  </div>
                  <Switch id="s-allowDownload" checked={allowDownload} onCheckedChange={setAllowDownload} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Độ mờ Watermark</Label>
                    <span className="text-xs text-muted-foreground">{watermarkOpacity[0]}%</span>
                  </div>
                  <Slider value={watermarkOpacity} onValueChange={setWatermarkOpacity} min={10} max={80} step={5} />
                </div>
              </div>

              <Separator />

              {/* Upload Area */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Tải ảnh lên</h3>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={cn(
                    'flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors',
                    isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/50 hover:bg-muted/50'
                  )}
                >
                  <label className="flex cursor-pointer flex-col items-center p-4">
                    <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
                    <p className="text-sm font-medium">Kéo thả hoặc nhấp để chọn</p>
                    <p className="text-xs text-muted-foreground mt-1">JPG, PNG • Chọn nhiều ảnh</p>
                    <input type="file" multiple accept="image/*" onChange={handleFileInput} className="hidden" />
                  </label>
                </div>

                {uploadFiles.length > 0 && (
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {uploadFiles.map(file => (
                      <div key={file.id} className="flex items-center gap-2 rounded-md border p-2">
                        <ImageIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs">{file.name}</p>
                          <Progress value={file.progress} className="mt-1 h-1" />
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {file.status === 'complete' ? '✓' : `${file.progress}%`}
                        </span>
                        <button type="button" onClick={() => removeFile(file.id)} className="shrink-0 text-muted-foreground hover:text-foreground">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit Button - luôn nằm cuối form */}
              <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                {isSubmitting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Đang tạo...</>
                ) : (
                  'Tạo dự án & gửi link'
                )}
              </Button>
            </form>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
