import { Skeleton } from "@/components/ui/skeleton"
import { TableSkeleton } from "@/components/skeletons"

export default function ProjectsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-32 shrink-0" />
      </div>

      <TableSkeleton />
    </div>
  )
}
