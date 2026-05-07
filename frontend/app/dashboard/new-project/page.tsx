import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NewProjectForm } from '@/components/new-project-form'

export default function NewProjectPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Quay lại bảng điều khiển</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Tạo show chụp mới
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Thiết lập bộ sưu tập ảnh mới cho khách hàng của bạn
          </p>
        </div>
      </div>

      {/* Form */}
      <NewProjectForm />
    </div>
  )
}
