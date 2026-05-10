'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Upload, X, Image as ImageIcon, Loader2, Link as LinkIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface UploadFile {
  id: string
  name: string
  progress: number
  status: 'pending' | 'uploading' | 'complete' | 'error'
  file: File
}

interface DriveImportItem {
  id: string
  name: string
  progress: number
  status: 'pending' | 'downloading' | 'uploading' | 'complete' | 'error'
  message?: string
}

interface NewProjectSheetButtonProps {
  className?: string
  variant?: 'default' | 'fab'
}

export function NewProjectSheetButton({ className, variant = 'default' }: NewProjectSheetButtonProps) {
  const router = useRouter()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [existingProjects, setExistingProjects] = useState<Array<{ clientName: string; clientEmail: string }>>([])
  const autoEmailNameRef = useRef('')

  // Form state
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [eventName, setEventName] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [maxSelections, setMaxSelections] = useState('50')
  const [deadline, setDeadline] = useState('')

  // Upload state
  const [isDragging, setIsDragging] = useState(false)
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([])
  const [driveLinksOpen, setDriveLinksOpen] = useState(false)
  const [driveLinks, setDriveLinks] = useState('')
  const [driveImportItems, setDriveImportItems] = useState<DriveImportItem[]>([])

  useEffect(() => {
    if (!sheetOpen) return
    fetch('/api/projects')
      .then(res => res.ok ? res.json() : [])
      .then(data => setExistingProjects(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [sheetOpen])

  useEffect(() => {
    const matched = existingProjects.find(
      p => p.clientName?.trim().toLowerCase() === clientName.trim().toLowerCase()
    )
    if (!matched) { autoEmailNameRef.current = ''; return }
    if (!clientEmail || autoEmailNameRef.current === matched.clientName) {
      setClientEmail(matched.clientEmail)
      autoEmailNameRef.current = matched.clientName
    }
  }, [clientName, clientEmail, existingProjects])

  const resetForm = () => {
    setClientName('')
    setClientEmail('')
    setEventName('')
    setEventDate('')
    setMaxSelections('50')
    setDeadline('')
    setUploadFiles([])
    setDriveLinks('')
    setDriveLinksOpen(false)
    setDriveImportItems([])
  }

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true) }, [])
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false) }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    addFiles(Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/')))
  }, [])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(e.target.files ? Array.from(e.target.files) : [])
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

  const importDriveLinks = async (projectId: string) => {
    const urls = driveLinks
      .split(/\s+/)
      .map(link => link.trim())
      .filter(Boolean)

    if (urls.length === 0) return { uploaded: 0, failed: 0 }

    setDriveImportItems(urls.map((url, index) => ({
      id: `link-${index}`,
      name: url,
      progress: 5,
      status: 'pending',
      message: 'Đang chuẩn bị đọc link...',
    })))

    let uploaded = 0
    let failed = 0

    const res = await fetch(`/api/projects/${projectId}/photos/google-drive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls }),
    })

    if (!res.ok || !res.body) {
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
          failed += 1
          upsertDriveImportItem(event.id, {
            name: event.name,
            progress: 100,
            status: 'error',
            message: event.message,
          })
        }

        if (event.type === 'done') {
          uploaded = event.uploaded || uploaded
          failed = event.failed ?? failed
        }

        if (event.type === 'error') {
          throw new Error(event.message)
        }
      }
    }

    return { uploaded, failed }
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
          maxSelections: parseInt(maxSelections, 10)
        })
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => null)
        if (errorData?.missing) {
          router.push('/dashboard/settings?setup=cloudinary')
          return
        }
        throw new Error(errorData?.error || 'Failed to create project')
      }
      const project = await res.json()
      let driveResult = { uploaded: 0, failed: 0 }

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
          await uploadRes.json()
          setUploadFiles(prev => prev.map(f => f.id === fileItem.id ? { ...f, status: 'complete', progress: 100 } : f))
        } else {
          setUploadFiles(prev => prev.map(f => f.id === fileItem.id ? { ...f, status: 'error' } : f))
        }
      }

      driveResult = await importDriveLinks(project.id)
      if (driveResult.uploaded > 0) {
        toast.success(`Đã tải ${driveResult.uploaded} ảnh từ Google Drive!`)
      }
      if (driveResult.failed > 0) {
        toast.error(`${driveResult.failed} link Google Drive không tải được. Vui lòng kiểm tra quyền truy cập.`)
      }

      toast.success('Tạo show chụp thành công! Link sẽ được gửi đến khách hàng.')
      resetForm()
      setSheetOpen(false)
      router.refresh()
      setTimeout(() => window.location.reload(), driveResult.failed > 0 ? 2500 : 100)
    } catch (err) {
      toast.error('Có lỗi xảy ra: ' + (err as Error).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      {variant === 'fab' ? (
        <Button size="icon" className={className} onClick={() => setSheetOpen(true)}>
          <Plus className="h-6 w-6" />
        </Button>
      ) : (
        <Button className={className} onClick={() => setSheetOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Show chụp mới
        </Button>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full !sm:max-w-lg p-0 flex flex-col" style={{ maxWidth: '32rem' }}>
          <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0">
            <SheetTitle>Tạo show chụp mới</SheetTitle>
            <SheetDescription>
              Nhập thông tin khách hàng và tải ảnh lên
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto">
            <form id="new-project-sheet-form" onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Client Info */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Thông tin khách hàng</h3>
                <div className="space-y-2">
                  <Label htmlFor="ns-clientName">Tên khách hàng</Label>
                  <Input id="ns-clientName" value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Nguyễn Văn A" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ns-clientEmail">Email</Label>
                  <Input id="ns-clientEmail" type="email" value={clientEmail} onChange={e => { autoEmailNameRef.current = ''; setClientEmail(e.target.value) }} placeholder="email@example.com" required />
                </div>
              </div>

              <Separator />

              {/* Project Details */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Chi tiết show chụp</h3>
                <div className="space-y-2">
                  <Label htmlFor="ns-eventName">Tên sự kiện</Label>
                  <Input id="ns-eventName" value={eventName} onChange={e => setEventName(e.target.value)} placeholder="Lễ cưới" required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="ns-eventDate">Ngày sự kiện</Label>
                    <Input id="ns-eventDate" type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ns-deadline">Hạn chọn ảnh</Label>
                    <Input id="ns-deadline" type="date" value={deadline} onChange={e => setDeadline(e.target.value)} required />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Selection Settings */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Cài đặt</h3>
                <div className="space-y-2">
                  <Label htmlFor="ns-maxSelections">Số ảnh tối đa</Label>
                  <Input id="ns-maxSelections" type="number" min="1" max="500" value={maxSelections} onChange={e => setMaxSelections(e.target.value)} required />
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

                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start gap-2 border-dashed"
                  onClick={() => setDriveLinksOpen(open => !open)}
                  disabled={isSubmitting}
                >
                  <LinkIcon className="h-4 w-4" />
                  Thêm ảnh từ Google Drive
                </Button>

                {driveLinksOpen && (
                  <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
                    <Label htmlFor="ns-driveLinks" className="text-xs">Link Google Drive</Label>
                    <Textarea
                      id="ns-driveLinks"
                      value={driveLinks}
                      onChange={e => setDriveLinks(e.target.value)}
                      placeholder="https://drive.google.com/file/d/.../view"
                      className="min-h-24 resize-y bg-background text-xs"
                      disabled={isSubmitting}
                    />
                    <p className="text-[10px] leading-relaxed text-muted-foreground">
                      Dán một hoặc nhiều link, mỗi link một dòng hoặc cách nhau bằng khoảng trắng. Link cần bật quyền “Anyone with the link can view”.
                    </p>
                  </div>
                )}

                <p className="text-[10px] text-muted-foreground text-center italic mb-2">
                  * Ảnh sẽ được tải lên sau khi bạn nhấn nút bên dưới
                </p>

                {uploadFiles.length > 0 && (
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {uploadFiles.map(file => (
                      <div key={file.id} className="flex items-center gap-2 rounded-md border p-2">
                        <ImageIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium">{file.name}</p>
                          {file.status === 'uploading' && (
                            <Progress value={file.progress} className="mt-1.5 h-1" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] text-muted-foreground">
                            {file.status === 'complete' ? (
                              <span className="text-green-500 font-bold">✓</span>
                            ) : file.status === 'uploading' ? (
                              `${file.progress}%`
                            ) : (
                              <span className="opacity-50 text-[9px] uppercase tracking-tighter">Sẵn sàng</span>
                            )}
                          </span>
                          <button type="button" onClick={() => removeFile(file.id)} className="text-muted-foreground hover:text-foreground">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {driveImportItems.length > 0 && (
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {driveImportItems.map(item => (
                      <div key={item.id} className="flex items-center gap-2 rounded-md border p-2">
                        <LinkIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium">{item.name}</p>
                          {item.status !== 'pending' && (
                            <Progress value={item.progress} className="mt-1.5 h-1" />
                          )}
                          {item.message && (
                            <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-muted-foreground">{item.message}</p>
                          )}
                        </div>
                        <span className={cn(
                          "shrink-0 text-[10px] font-medium",
                          item.status === 'complete' && "text-green-500",
                          item.status === 'error' && "text-red-500",
                          (item.status === 'downloading' || item.status === 'uploading') && "text-primary"
                        )}>
                          {item.status === 'complete'
                            ? 'Xong'
                            : item.status === 'error'
                              ? 'Lỗi'
                              : item.status === 'pending'
                                ? 'Chờ'
                                : `${item.progress}%`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit */}
              <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                {isSubmitting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Đang tạo...</>
                ) : (
                  'Tạo show chụp & gửi link'
                )}
              </Button>
            </form>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
