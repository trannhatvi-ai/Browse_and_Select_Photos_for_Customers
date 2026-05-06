'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Upload, Image as ImageIcon, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import Link from 'next/link'

export default function ProjectManagementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [project, setProject] = useState<any>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const router = useRouter()

  useEffect(() => {
    fetch(`/api/projects/${id}/details`) // Cần tạo API này hoặc lấy từ projects list
      .then(res => res.json())
      .then(data => setProject(data))
  }, [id])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    setProgress(10)

    const formData = new FormData()
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i])
    }

    try {
      const res = await fetch(`/api/projects/${id}/photos`, {
        method: 'POST',
        body: formData,
      })
      
      if (res.ok) {
        setProgress(100)
        setTimeout(() => {
          setUploading(false)
          setProgress(0)
          window.location.reload()
        }, 1000)
      }
    } catch (err) {
      alert('Upload lỗi!')
      setUploading(false)
    }
  }

  if (!project) return <div className="p-8">Đang tải...</div>

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/projects"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{project.eventName}</h1>
          <p className="text-muted-foreground">Khách hàng: {project.clientName} | Mã: <code className="bg-muted px-1 rounded">{project.accessToken}</code></p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Thêm ảnh mới</CardTitle>
            <CardDescription>Tải ảnh lên Cloudinary và tự đóng watermark</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center space-y-4 hover:bg-muted/50 transition-colors relative">
              <input 
                type="file" 
                multiple 
                className="absolute inset-0 opacity-0 cursor-pointer" 
                onChange={handleFileUpload}
                disabled={uploading}
              />
              <Upload className="mx-auto h-10 w-10 text-muted-foreground" />
              <div>
                <p className="font-medium">Nhấn để chọn hoặc kéo thả</p>
                <p className="text-xs text-muted-foreground">JPG, PNG (Max 10MB/file)</p>
              </div>
            </div>
            
            {uploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span>Đang tải lên...</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-1" />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Ảnh trong dự án ({project.photos?.length || 0})</CardTitle>
              <CardDescription>Khách đã chọn {project.photos?.filter((p:any) => p.selected).length || 0} ảnh</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {project.photos?.map((photo: any) => (
                <div key={photo.id} className="group relative aspect-square bg-muted rounded overflow-hidden">
                  <img src={photo.previewUrl} alt="" className="object-cover w-full h-full" />
                  {photo.selected && (
                    <div className="absolute top-1 right-1 bg-primary text-white p-0.5 rounded-full">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
                    </div>
                  )}
                </div>
              ))}
              {(!project.photos || project.photos.length === 0) && (
                <div className="col-span-full py-12 text-center text-muted-foreground">
                  Chưa có ảnh nào trong dự án này.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
