'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

interface UploadFile {
  id: string
  name: string
  progress: number
  status: 'pending' | 'uploading' | 'complete' | 'error'
  file: File
}

export function NewProjectForm() {
  const router = useRouter()
  const [existingProjects, setExistingProjects] = useState<Array<{ clientName: string; clientEmail: string }>>([])
  const [loadingExisting, setLoadingExisting] = useState(true)
  const autoEmailNameRef = useRef('')

  // Form state
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [accessPassword, setAccessPassword] = useState('')
  const [eventName, setEventName] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [maxSelections, setMaxSelections] = useState('50')
  const [deadline, setDeadline] = useState('')

  // Upload state
  const [isDragging, setIsDragging] = useState(false)
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    setLoadingExisting(true)
    fetch('/api/projects')
      .then((res) => (res.ok ? res.json() : []))
      .then((projects) => setExistingProjects(projects))
      .catch(() => {})
      .finally(() => setLoadingExisting(false))
  }, [])

  useEffect(() => {
    const matchedProject = existingProjects.find(
      (project) => project.clientName.trim().toLowerCase() === clientName.trim().toLowerCase()
    )

    if (!matchedProject) {
      autoEmailNameRef.current = ''
      return
    }

    if (!clientEmail || autoEmailNameRef.current === matchedProject.clientName) {
      setClientEmail(matchedProject.clientEmail)
      autoEmailNameRef.current = matchedProject.clientName
    }
  }, [clientName, clientEmail, existingProjects])

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

    const files = Array.from(e.dataTransfer.files).filter((file) =>
      file.type.startsWith('image/')
    )
    handleFiles(files)
  }, [])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : []
    handleFiles(files)
  }

  const handleFiles = (files: File[]) => {
    const newFiles: UploadFile[] = files.map((file, index) => ({
      id: `${Date.now()}-${index}`,
      name: file.name,
      progress: 0,
      status: 'pending',
      file,
    }))

    setUploadFiles((prev) => [...prev, ...newFiles])
  }

  const removeFile = (id: string) => {
    setUploadFiles((prev) => prev.filter((f) => f.id !== id))
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

      // Upload files song song (batch 3)
      const filesToUpload = uploadFiles.filter(f => f.status !== 'complete')
      const BATCH_SIZE = 3
      
      for (let i = 0; i < filesToUpload.length; i += BATCH_SIZE) {
        const batch = filesToUpload.slice(i, i + BATCH_SIZE)
        await Promise.all(batch.map(async (fileItem) => {
          const formData = new FormData()
          formData.append('files', fileItem.file)

          setUploadFiles(prev => prev.map(f => f.id === fileItem.id ? { ...f, status: 'uploading', progress: 0 } : f))

          try {
            const uploadPromise = new Promise((resolve, reject) => {
              const xhr = new XMLHttpRequest()
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
              xhr.open('POST', `/api/projects/${project.id}/photos`)
              xhr.send(formData)
            })

            await uploadPromise
            setUploadFiles(prev => prev.map(f => f.id === fileItem.id ? { ...f, status: 'complete', progress: 100 } : f))
          } catch (err) {
            console.error(`Failed to upload ${fileItem.name}:`, err)
            setUploadFiles(prev => prev.map(f => f.id === fileItem.id ? { ...f, status: 'error' } : f))
          }
        }))
      }

      alert('Tạo show chụp thành công! Link sẽ được gửi đến khách hàng.')
      router.push('/dashboard')
    } catch (err) {
      alert('Có lỗi xảy ra: ' + (err as Error).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-8">
      {/* Client Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Thông tin khách hàng</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="clientName">Tên khách hàng</Label>
            <div className="flex items-center gap-2">
              <Input
                id="clientName"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Nguyễn Văn A"
                required
              />
              {loadingExisting && (
                <div className="h-8 w-16 rounded bg-muted animate-pulse" />
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="clientEmail">Địa chỉ Email</Label>
            <div className="flex items-center gap-2">
              <Input
                id="clientEmail"
                type="email"
                value={clientEmail}
                onChange={(e) => {
                  autoEmailNameRef.current = ''
                  setClientEmail(e.target.value)
                }}
                placeholder="email@example.com"
                required
              />
              {loadingExisting && (
                <div className="h-8 w-40 rounded bg-muted animate-pulse" />
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="accessPassword">
              Mật khẩu truy cập{' '}
              <span className="text-muted-foreground">(tùy chọn)</span>
            </Label>
            <Input
              id="accessPassword"
              type="password"
              value={accessPassword}
              onChange={(e) => setAccessPassword(e.target.value)}
              placeholder="Để trống nếu không cần mật khẩu"
            />
          </div>
        </CardContent>
      </Card>

      {/* Project Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Chi tiết show chụp</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="eventName">Tên sự kiện</Label>
            <Input
              id="eventName"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              placeholder="Lễ cưới"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="eventDate">Ngày sự kiện</Label>
            <Input
              id="eventDate"
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              required
            />
          </div>
        </CardContent>
      </Card>

      {/* Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Cài đặt chọn ảnh</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="maxSelections">Số ảnh tối đa được chọn</Label>
            <Input
              id="maxSelections"
              type="number"
              min="1"
              max="500"
              value={maxSelections}
              onChange={(e) => setMaxSelections(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Số lượng ảnh khách hàng có thể chọn
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="deadline">Hạn chót chọn ảnh</Label>
            <Input
              id="deadline"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              required
            />
          </div>
        </CardContent>
      </Card>

      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tải lên ảnh</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              'flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors',
              isDragging
                ? 'border-primary bg-primary/5'
                : 'border-border bg-muted/30 hover:border-muted-foreground/50 hover:bg-muted/50'
            )}
          >
            <label className="flex cursor-pointer flex-col items-center">
              <Upload className="mb-3 h-10 w-10 text-muted-foreground" />
              <p className="mb-1 text-sm font-medium text-foreground">
                Kéo thả ảnh vào đây
              </p>
              <p className="text-xs text-muted-foreground">hoặc nhấp để chọn file</p>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileInput}
                className="hidden"
              />
            </label>
          </div>

          {/* Upload Progress */}
          {uploadFiles.length > 0 && (
            <div className="space-y-3">
              {uploadFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
                >
                  <ImageIcon className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{file.name}</p>
                    <Progress value={file.progress} className="mt-1 h-1.5" />
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {file.status === 'complete'
                      ? 'Xong'
                      : `${Math.round(file.progress)}%`}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFile(file.id)}
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex justify-end">
        <Button type="submit" size="lg" className="px-8" disabled={isSubmitting}>
          {isSubmitting ? 'Đang lưu...' : 'Lưu & Gửi link cho khách hàng'}
        </Button>
      </div>
    </form>
  )
}
