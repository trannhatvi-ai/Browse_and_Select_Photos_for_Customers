"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  ChevronRight,
  Share2,
  Settings,
  ImageIcon,
  CheckCircle2,
  Target,
  Eye,
  ChevronDown,
  Upload,
  Sparkles,
  MoreHorizontal,
  Trash2,
  Download,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { AIInsightSheet } from "./ai-insight-sheet"
import type { Photo, Project } from "@/lib/types"

interface ProjectDetailProps {
  project: Project
  photos: Photo[]
}

export function ProjectDetail({ project, photos: initialPhotos }: ProjectDetailProps) {
  const [photos, setPhotos] = useState(initialPhotos)
  const [configOpen, setConfigOpen] = useState(false)
  const [maxLimit, setMaxLimit] = useState(project.maxSelections)
  const [selectedPhotoForAI, setSelectedPhotoForAI] = useState<Photo | null>(null)
  const [aiSheetOpen, setAISheetOpen] = useState(false)

  const selectedCount = photos.filter((p) => p.selected).length
  const viewCount = 127 // Mock view count

  const handlePhotoSelect = (photoId: string) => {
    setPhotos((prev) =>
      prev.map((p) =>
        p.id === photoId ? { ...p, selected: !p.selected } : p
      )
    )
  }

  const handleAIInsight = (photo: Photo) => {
    setSelectedPhotoForAI(photo)
    setAISheetOpen(true)
  }

  const getStatusBadgeVariant = (status: Project["status"]) => {
    switch (status) {
      case "uploading":
        return "secondary"
      case "choosing":
        return "default"
      case "done":
        return "outline"
      default:
        return "secondary"
    }
  }

  const getStatusText = (status: Project["status"]) => {
    switch (status) {
      case "uploading":
        return "Đang tải lên"
      case "choosing":
        return "Đang chọn"
      case "done":
        return "Hoàn thành"
      default:
        return status
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/dashboard/projects">Show</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>
                <ChevronRight className="h-4 w-4" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbPage>{project.eventName}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-foreground tracking-tight">
              {project.eventName}
            </h1>
            <Badge variant={getStatusBadgeVariant(project.status)}>
              {getStatusText(project.status)}
            </Badge>
          </div>

          <p className="text-sm text-muted-foreground">
            Khách hàng: {project.clientName} &bull; {project.clientEmail}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Share2 className="h-4 w-4 mr-2" />
            Chia sẻ
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Cài đặt
          </Button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="flex items-center gap-6 p-3 rounded-lg bg-muted/50 border">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Tổng ảnh</span>
          <span className="text-sm font-semibold text-foreground">{photos.length}</span>
        </div>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <span className="text-sm text-muted-foreground">Đã chọn</span>
          <span className="text-sm font-semibold text-foreground">{selectedCount}</span>
        </div>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-blue-600" />
          <span className="text-sm text-muted-foreground">Giới hạn</span>
          <span className="text-sm font-semibold text-foreground">{maxLimit}</span>
        </div>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-amber-600" />
          <span className="text-sm text-muted-foreground">Lượt xem</span>
          <span className="text-sm font-semibold text-foreground">{viewCount}</span>
        </div>
      </div>

      {/* Collapsible Config Section */}
      <Collapsible open={configOpen} onOpenChange={setConfigOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Cấu hình show
                </CardTitle>
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform ${
                    configOpen ? "rotate-180" : ""
                  }`}
                />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 pb-4">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Max Photos Limit */}
                <div className="space-y-2">
                  <Label htmlFor="maxLimit">Số ảnh tối đa được chọn</Label>
                  <Input
                    id="maxLimit"
                    type="number"
                    value={maxLimit}
                    onChange={(e) => setMaxLimit(parseInt(e.target.value) || 0)}
                    className="max-w-[200px]"
                  />
                  <p className="text-xs text-muted-foreground">
                    Khách hàng có thể chọn tối đa {maxLimit} ảnh
                  </p>
                </div>

                {/* Upload Area */}
                <div className="space-y-2">
                  <Label>Tải thêm ảnh</Label>
                  <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 hover:bg-muted/50 transition-colors cursor-pointer">
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Kéo thả hoặc nhấn để tải ảnh
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PNG, JPG tối đa 20MB
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Photo Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-foreground">
            Ảnh trong show ({photos.length})
          </h2>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Tải xuống tất cả
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="group relative aspect-square rounded-lg overflow-hidden bg-muted border hover:ring-2 hover:ring-primary/50 transition-all"
            >
              <Image
                src={photo.src}
                alt={photo.filename}
                fill
                className="object-cover"
              />

              {/* Checkbox overlay */}
              <div className="absolute top-2 left-2 z-10">
                <Checkbox
                  checked={photo.selected}
                  onCheckedChange={() => handlePhotoSelect(photo.id)}
                  className="h-5 w-5 bg-white/90 border-white data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
              </div>

              {/* AI Insight button */}
              <button
                onClick={() => handleAIInsight(photo)}
                className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-white/90 hover:bg-white text-amber-600 hover:text-amber-700 transition-colors opacity-0 group-hover:opacity-100"
                title="Xem phân tích AI"
              >
                <Sparkles className="h-4 w-4" />
              </button>

              {/* Hover overlay with actions */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end justify-center pb-3 opacity-0 group-hover:opacity-100">
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-8 text-xs"
                    onClick={() => handlePhotoSelect(photo.id)}
                  >
                    {photo.selected ? "Bỏ chọn" : "Chọn"}
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="secondary" className="h-8 px-2">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleAIInsight(photo)}>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Phân tích AI
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Download className="h-4 w-4 mr-2" />
                        Tải xuống
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Xóa ảnh
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Selected indicator */}
              {photo.selected && (
                <div className="absolute inset-0 ring-2 ring-inset ring-primary pointer-events-none" />
              )}

              {/* Filename */}
              <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-xs text-white truncate">{photo.filename}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Insight Sheet */}
      <AIInsightSheet
        photo={selectedPhotoForAI}
        open={aiSheetOpen}
        onOpenChange={setAISheetOpen}
        onSelect={handlePhotoSelect}
        isSelected={selectedPhotoForAI ? photos.find(p => p.id === selectedPhotoForAI.id)?.selected : false}
      />
    </div>
  )
}
