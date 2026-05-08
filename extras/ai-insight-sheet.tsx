"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Sparkles,
  Sun,
  User,
  Palette,
  Wand2,
  Heart,
  Copy,
  Check,
} from "lucide-react"
import type { Photo } from "@/lib/types"

interface AIInsight {
  lighting: string
  subject: string
  mood: string
  retouchingTags: string[]
}

interface AIInsightSheetProps {
  photo: Photo | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect?: (photoId: string) => void
  isSelected?: boolean
}

// Simulated AI insights based on photo
const generateInsights = (photo: Photo): AIInsight => {
  const insights: AIInsight[] = [
    {
      lighting: "Ánh sáng tự nhiên mềm mại từ cửa sổ bên trái, tạo hiệu ứng chiếu sáng Rembrandt tinh tế trên khuôn mặt chủ thể.",
      subject: "Chân dung nửa người của một người phụ nữ trẻ, biểu cảm tự nhiên với ánh mắt hướng về máy ảnh.",
      mood: "Ấm áp, thân mật và chuyên nghiệp. Phù hợp cho ảnh doanh nghiệp hoặc portfolio cá nhân.",
      retouchingTags: ["Làm mịn da", "Tăng sáng mắt", "Cân bằng màu", "Xóa tóc rối"],
    },
    {
      lighting: "Ánh sáng hoàng hôn vàng ấm, backlight tạo viền sáng quanh tóc và vai.",
      subject: "Cặp đôi đang bước đi, nắm tay nhau trong khung cảnh ngoài trời lãng mạn.",
      mood: "Lãng mạn, dreamy và cinematic. Hoàn hảo cho ảnh cưới hoặc engagement.",
      retouchingTags: ["Tăng tone ấm", "Làm mờ nền", "Dodge & burn", "Grain phim"],
    },
    {
      lighting: "Studio lighting chuyên nghiệp với main light 45 độ và fill light nhẹ.",
      subject: "Sản phẩm thời trang được trưng bày trên người mẫu với pose động.",
      mood: "Hiện đại, thời thượng và cao cấp. Phù hợp cho catalogue hoặc lookbook.",
      retouchingTags: ["Chỉnh màu vải", "Xóa nếp nhăn", "Làm sắc nét", "Liquify"],
    },
  ]
  
  // Use photo id to consistently return the same insight
  const index = parseInt(photo.id.replace(/\D/g, '')) % insights.length
  return insights[index]
}

export function AIInsightSheet({
  photo,
  open,
  onOpenChange,
  onSelect,
  isSelected = false,
}: AIInsightSheetProps) {
  const [insights, setInsights] = useState<AIInsight | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [displayedText, setDisplayedText] = useState<Record<string, string>>({})
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (open && photo) {
      setIsLoading(true)
      setDisplayedText({})
      setInsights(null)

      // Simulate AI processing delay
      const timer = setTimeout(() => {
        const newInsights = generateInsights(photo)
        setInsights(newInsights)
        setIsLoading(false)

        // Typing animation for each field
        const fields = ['lighting', 'subject', 'mood'] as const
        fields.forEach((field, fieldIndex) => {
          const text = newInsights[field]
          let charIndex = 0

          const typeInterval = setInterval(() => {
            if (charIndex <= text.length) {
              setDisplayedText(prev => ({
                ...prev,
                [field]: text.slice(0, charIndex),
              }))
              charIndex++
            } else {
              clearInterval(typeInterval)
            }
          }, 15 + fieldIndex * 5)
        })
      }, 800)

      return () => clearTimeout(timer)
    }
  }, [open, photo])

  const handleCopyInsights = () => {
    if (!insights) return
    const text = `Phân tích AI cho ${photo?.filename}:\n\nÁnh sáng: ${insights.lighting}\n\nChủ thể: ${insights.subject}\n\nTông màu: ${insights.mood}\n\nGợi ý retouch: ${insights.retouchingTags.join(', ')}`
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!photo) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-2">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-amber-500" />
            Phân Tích AI
          </SheetTitle>
        </SheetHeader>

        {/* Photo Preview */}
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border bg-muted">
          <Image
            src={photo.src}
            alt={photo.filename}
            fill
            className="object-cover"
          />
          {isSelected && (
            <div className="absolute top-3 right-3">
              <Badge className="bg-accent text-accent-foreground">
                <Heart className="h-3 w-3 mr-1 fill-current" />
                Đã chọn
              </Badge>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between py-3">
          <span className="text-sm font-medium text-foreground">{photo.filename}</span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyInsights}
              disabled={!insights}
            >
              {copied ? (
                <Check className="h-4 w-4 mr-1" />
              ) : (
                <Copy className="h-4 w-4 mr-1" />
              )}
              {copied ? "Đã sao chép" : "Sao chép"}
            </Button>
            {onSelect && (
              <Button
                variant={isSelected ? "secondary" : "default"}
                size="sm"
                onClick={() => onSelect(photo.id)}
              >
                <Heart className={`h-4 w-4 mr-1 ${isSelected ? "fill-current" : ""}`} />
                {isSelected ? "Bỏ chọn" : "Chọn ảnh"}
              </Button>
            )}
          </div>
        </div>

        <Separator />

        {/* AI Insights Section */}
        <div className="py-4 space-y-4">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Sparkles className="h-5 w-5 text-amber-500" />
              <div className="absolute inset-0 animate-ping">
                <Sparkles className="h-5 w-5 text-amber-500 opacity-30" />
              </div>
            </div>
            <h3 className="font-semibold text-foreground">Gemini Intelligence</h3>
            {isLoading && (
              <span className="text-xs text-muted-foreground animate-pulse">
                Đang phân tích...
              </span>
            )}
          </div>

          {/* AI Content with glowing border */}
          <div className="relative rounded-lg border border-amber-500/30 bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/20 p-4 space-y-4">
            {/* Glowing effect */}
            <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 animate-pulse pointer-events-none" />

            {/* Lighting Analysis */}
            <div className="relative space-y-1.5">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Sun className="h-4 w-4 text-amber-600" />
                Phân tích ánh sáng
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed min-h-[3rem]">
                {isLoading ? (
                  <span className="inline-block w-full h-4 bg-muted animate-pulse rounded" />
                ) : (
                  displayedText.lighting || ""
                )}
                {!isLoading && displayedText.lighting !== insights?.lighting && (
                  <span className="inline-block w-0.5 h-4 bg-foreground animate-pulse ml-0.5" />
                )}
              </p>
            </div>

            {/* Subject Description */}
            <div className="relative space-y-1.5">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <User className="h-4 w-4 text-blue-600" />
                Mô tả chủ thể
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed min-h-[3rem]">
                {isLoading ? (
                  <span className="inline-block w-full h-4 bg-muted animate-pulse rounded" />
                ) : (
                  displayedText.subject || ""
                )}
                {!isLoading && displayedText.subject !== insights?.subject && (
                  <span className="inline-block w-0.5 h-4 bg-foreground animate-pulse ml-0.5" />
                )}
              </p>
            </div>

            {/* Mood */}
            <div className="relative space-y-1.5">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Palette className="h-4 w-4 text-purple-600" />
                Tông màu & Cảm xúc
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed min-h-[3rem]">
                {isLoading ? (
                  <span className="inline-block w-full h-4 bg-muted animate-pulse rounded" />
                ) : (
                  displayedText.mood || ""
                )}
                {!isLoading && displayedText.mood !== insights?.mood && (
                  <span className="inline-block w-0.5 h-4 bg-foreground animate-pulse ml-0.5" />
                )}
              </p>
            </div>

            {/* Retouching Tags */}
            <div className="relative space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Wand2 className="h-4 w-4 text-green-600" />
                Gợi ý Retouch
              </div>
              <div className="flex flex-wrap gap-2">
                {isLoading ? (
                  <>
                    <span className="inline-block w-20 h-6 bg-muted animate-pulse rounded-full" />
                    <span className="inline-block w-24 h-6 bg-muted animate-pulse rounded-full" />
                    <span className="inline-block w-16 h-6 bg-muted animate-pulse rounded-full" />
                  </>
                ) : (
                  insights?.retouchingTags.map((tag, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="text-xs bg-white/80 dark:bg-slate-800/80"
                    >
                      {tag}
                    </Badge>
                  ))
                )}
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Phân tích được tạo bởi Gemini AI. Kết quả chỉ mang tính tham khảo.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  )
}
