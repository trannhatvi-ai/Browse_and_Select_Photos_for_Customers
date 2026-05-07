'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Upload, Image as ImageIcon, Trash2, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
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
import Link from 'next/link'
import { toast } from 'sonner'
import { StudioLightbox } from '@/components/studio-lightbox'

export default function ProjectManagementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [project, setProject] = useState<any>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [deletePhotoTarget, setDeletePhotoTarget] = useState<any>(null)
  const router = useRouter()

  const fetchDetails = async () => {
    const res = await fetch(`/api/projects/${id}/details`)
    const data = await res.json()
    setProject(data)
  }

  useEffect(() => {
    fetchDetails()
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
        toast.success('Đã tải ảnh lên thành công!')
        setTimeout(() => {
          setUploading(false)
          setProgress(0)
          fetchDetails()
        }, 1000)
      }
    } catch (err) {
      toast.error('Upload lỗi!')
      setUploading(false)
    }
  }

  const handleDeletePhoto = async () => {
    if (!deletePhotoTarget) return
    try {
      const res = await fetch(`/api/projects/${id}/photos`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoId: deletePhotoTarget.id })
      })
      if (res.ok) {
        toast.success('Đã xóa ảnh!')
        fetchDetails()
        setLightboxOpen(false)
      } else {
        toast.error('Xóa thất bại!')
      }
    } catch (err) {
      toast.error('Lỗi kết nối!')
    } finally {
      setDeletePhotoTarget(null)
    }
  }

  if (!project) return <div className="p-8">Đang tải...</div>

  const formattedPhotos = (project?.photos || []).map((p: any) => ({
    ...p,
    src: p.previewUrl || (p.originalUrl?.startsWith('http') ? p.originalUrl : null) || p.url
  }))

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
              <CardTitle>Ảnh trong show chụp ({project.photos?.length || 0})</CardTitle>
              <CardDescription>Khách đã chọn {project.photos?.filter((p:any) => p.selected).length || 0} ảnh</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {project.photos?.map((photo: any, index: number) => (
                <div 
                  key={photo.id} 
                  className="group relative aspect-square bg-muted rounded overflow-hidden cursor-pointer" 
                  onClick={() => {
                    setLightboxIndex(index)
                    setLightboxOpen(true)
                  }}
                >
                  <img src={photo.previewUrl} alt="" className="object-cover w-full h-full transition-transform group-hover:scale-105" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Eye className="text-white h-6 w-6" />
                  </div>
                  {photo.selected && (
                    <div className="absolute top-1 right-1 bg-green-500 text-white p-0.5 rounded-full shadow-sm z-10">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
                    </div>
                  )}
                </div>
              ))}
              {(!project.photos || project.photos.length === 0) && (
                <div className="col-span-full py-12 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                  <ImageIcon className="mx-auto h-10 w-10 mb-2 opacity-20" />
                  <p>Chưa có ảnh nào trong show chụp này.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <StudioLightbox
        photos={formattedPhotos}
        currentIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onNavigate={setLightboxIndex}
        onDelete={(photo) => setDeletePhotoTarget(photo)}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={Boolean(deletePhotoTarget)} onOpenChange={(open) => !open && setDeletePhotoTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa ảnh này?</AlertDialogTitle>
            <AlertDialogDescription>
              Ảnh <strong>{deletePhotoTarget?.filename}</strong> sẽ bị xóa vĩnh viễn. Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePhoto} className="bg-red-600 hover:bg-red-700">Xóa</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
