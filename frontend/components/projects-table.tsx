'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, MoreHorizontal, Download, Link as LinkIcon, Upload, Image as ImageIcon, Trash2, ArrowUpDown, Search, SlidersHorizontal, Loader2, ExternalLink } from 'lucide-react'
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { Project } from '@/lib/types'

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
type ExportFormat = 'txt' | 'csv' | 'ps1'

const exportOptions: Array<{
  format: ExportFormat
  label: string
  description: string
  extension: string
}> = [
  {
    format: 'txt',
    label: 'TXT - lọc nhanh',
    description: 'Mỗi dòng một tên file, hợp để tìm trong folder local.',
    extension: 'txt',
  },
  {
    format: 'csv',
    label: 'CSV - kèm ghi chú',
    description: 'Có filename, comment và originalUrl để studio đối soát.',
    extension: 'csv',
  },
  {
    format: 'ps1',
    label: 'Copy-selected PowerShell',
    description: 'Đặt vào folder ảnh gốc để copy ảnh đã chọn sang SELECTED.',
    extension: 'ps1',
  },
]

function safeDownloadName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    || 'project'
}

export function ProjectsTable({ projects: initialProjects, onRefresh }: ProjectsTableProps) {
  const router = useRouter()
  // Shared UI state
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null)
  const [exportLoadingIds, setExportLoadingIds] = useState<string[]>([])
  const [syncingIds, setSyncingIds] = useState<string[]>([])

  // Desktop-only state
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'eventDate', direction: 'desc' })

  const handleDownloadExport = async (project: any, format: ExportFormat) => {
    if (exportLoadingIds.includes(project.id)) return

    const option = exportOptions.find((item) => item.format === format)
    setExportLoadingIds(prev => [...prev, project.id])

    try {
      const res = await fetch(`/api/projects/${project.id}/export?format=${format}`)
      if (!res.ok) return toast.error('Không thể tải danh sách ảnh đã chọn!')

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      const suffix = format === 'ps1' ? '_copy-selected.ps1' : `.${option?.extension ?? format}`
      a.href = url
      a.download = `Selected_Photos_${safeDownloadName(project.clientName)}${suffix}`
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success(format === 'ps1' ? 'Đã tải script copy ảnh!' : 'Đã tải danh sách ảnh đã chọn!')
    } catch (e) {
      toast.error('Lỗi khi tải xuống')
    } finally {
      setExportLoadingIds(prev => prev.filter(id => id !== project.id))
    }
  }

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

  const handleViewProject = (accessToken: string) => {
    router.push(`/dashboard/projects/${accessToken}`)
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
                          variant="outline" size="icon" className="h-8 w-8 text-sky-600 hover:text-sky-700 hover:bg-sky-50 border-sky-200"
                          title="Mở link gallery"
                          onClick={() => {
                            if (!project.accessToken) return
                            const url = `${window.location.origin}/gallery/${project.accessToken}`
                            window.open(url, '_blank')
                          }}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
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
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="default" size="icon"
                              className="h-8 w-8 border border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100 hover:text-emerald-800"
                              title="Tải file kết quả ảnh khách chọn"
                            >
                              {exportLoadingIds.includes(project.id) ? (
                                <div className="h-4 w-4 rounded-full border-b-2 border-white animate-spin" />
                              ) : (
                                <Download className="h-4 w-4" />
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-72">
                            <DropdownMenuLabel>Chọn định dạng tải xuống</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {exportOptions.map((option) => (
                              <DropdownMenuItem
                                key={option.format}
                                className="flex flex-col items-start gap-0.5"
                                onClick={() => handleDownloadExport(project, option.format)}
                              >
                                <span className="font-medium">{option.label}</span>
                                <span className="text-xs text-muted-foreground">{option.description}</span>
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 border-slate-300 bg-slate-50 text-slate-700 shadow-sm hover:border-slate-400 hover:bg-slate-100 hover:text-slate-900"
                          onClick={() => handleViewProject(project.accessToken)}
                        >
                          <Eye className="mr-1.5 h-4 w-4" /> Chi tiết
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
              {/* Top row: Client Name + Badges */}
              <div className="flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-lg truncate leading-none">{project.clientName}</h3>
                  <div className="flex flex-wrap gap-1.5 shrink-0 justify-end">
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
                        project.status === 'CHOOSING'
                          ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                          : 'bg-green-500/10 text-green-600 border border-green-500/20'
                      )}
                    >
                      {project.status === 'CHOOSING' ? 'Đang chọn' : 'Hoàn thành'}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 border border-blue-500/20 uppercase tracking-wider">
                      Hạn: {formatDate(project.deadline)}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground truncate leading-none">{project.eventName}</p>
              </div>

              {/* Bottom row: Quick Actions Only */}
              <div className="pt-3 border-t">
                <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {/* Mobile: icons only except View (keeps text). Order: Copy, View, Download, Open */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-10 px-3 text-xs flex-none"
                    aria-label="Sao chép link"
                    onClick={() => {
                      if (!project.accessToken) return toast.error('Không có link show chụp')
                      const url = `${window.location.origin}/gallery/${project.accessToken}`
                      navigator.clipboard.writeText(url)
                      toast.success('Đã copy link gallery!')
                    }}
                  >
                    <LinkIcon className="h-4 w-4" />
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    className="h-10 px-3 text-xs flex-1 min-w-[80px] border-slate-300 bg-slate-50 text-slate-700 shadow-sm hover:border-slate-400 hover:bg-slate-100 hover:text-slate-900"
                    onClick={() => handleViewProject(project.accessToken)}
                  >
                    <Eye className="mr-1 h-3.5 w-3.5" /> Chi tiết
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="default"
                        size="sm"
                        className="h-10 px-3 text-xs flex-none border border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100 hover:text-emerald-800"
                        aria-label="Tải file kết quả"
                      >
                        {exportLoadingIds.includes(project.id) ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-72">
                      <DropdownMenuLabel>Chọn định dạng tải xuống</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {exportOptions.map((option) => (
                        <DropdownMenuItem
                          key={option.format}
                          className="flex flex-col items-start gap-0.5"
                          onClick={() => handleDownloadExport(project, option.format)}
                        >
                          <span className="font-medium">{option.label}</span>
                          <span className="text-xs text-muted-foreground">{option.description}</span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Button
                    variant="outline"
                    size="sm"
                    className="h-10 px-3 text-xs flex-none"
                    aria-label="Mở gallery"
                    onClick={() => {
                      if (!project.accessToken) return toast.error('Không có link show chụp')
                      const url = `${window.location.origin}/gallery/${project.accessToken}`
                      window.open(url, '_blank')
                    }}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

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
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={async (e) => {
                e.preventDefault()
                if (deleteProjectId) {
                  try {
                    const res = await fetch(`/api/projects/${deleteProjectId}`, { method: 'DELETE' })
                    if (res.ok) {
                      toast.success('Đã xóa show chụp!')
                      setDeleteProjectId(null)
                      if (onRefresh) onRefresh()
                    } else {
                      toast.error('Xóa thất bại!')
                    }
                  } catch {
                    toast.error('Lỗi kết nối!')
                  }
                }
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
