import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export function TableSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between p-4 border-b gap-4 flex-wrap">
        <Skeleton className="h-10 w-[240px] max-w-md rounded-md" />
        <Skeleton className="h-10 w-[180px] rounded-md" />
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">Khách hàng</TableHead>
              <TableHead className="w-[200px]">Sự kiện</TableHead>
              <TableHead className="w-[120px]">Ngày</TableHead>
              <TableHead className="w-[140px]">Trạng thái</TableHead>
              <TableHead className="w-[120px]">Hạn chót</TableHead>
              <TableHead className="w-[100px] text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <Skeleton className="h-8 w-20 rounded-md" />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

export function ProjectDetailsSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-0 pb-36 sm:px-6 lg:px-8">
      <header className="sticky top-0 z-30 mb-6 -mx-4 border-b bg-background/95 p-4 backdrop-blur sm:-mx-6 sm:p-6 lg:-mx-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0 sm:gap-4">
            <Skeleton className="h-10 w-10 rounded-md" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-64 rounded-md" />
              <Skeleton className="h-4 w-48 rounded-md" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-28 rounded-md" />
            <Skeleton className="h-10 w-28 rounded-md" />
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-xl" />
            ))}
          </div>
        </div>
        <aside className="hidden lg:block space-y-6">
          <Skeleton className="h-12 w-full rounded-2xl" />
          <div className="space-y-4">
            <Skeleton className="h-6 w-32" />
            <div className="rounded-3xl border p-5 space-y-6">
              <Skeleton className="h-10 w-full rounded-md" />
              <Skeleton className="h-10 w-full rounded-md" />
              <Skeleton className="h-10 w-full rounded-md" />
              <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-10 w-full rounded-md" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
              <Skeleton className="h-24 w-full rounded-2xl" />
              <Skeleton className="h-12 w-full rounded-2xl" />
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

export function GallerySkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 p-4">
        <div className="mx-auto max-w-7xl flex justify-between items-center">
          <Skeleton className="h-8 w-40 rounded-md" />
          <Skeleton className="h-10 w-64 rounded-full hidden sm:block" />
          <Skeleton className="h-8 w-24 rounded-md" />
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-8 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <Skeleton className="h-10 w-24 rounded-full shrink-0" />
          <Skeleton className="h-10 w-24 rounded-full shrink-0" />
          <Skeleton className="h-10 w-24 rounded-full shrink-0" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 15 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[4/3] rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  )
}
