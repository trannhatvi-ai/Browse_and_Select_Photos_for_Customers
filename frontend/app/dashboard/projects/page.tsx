'use client'

import { useState, useEffect } from 'react'
import { ProjectsTable } from '@/components/projects-table'
import { NewProjectSheetButton } from '@/components/new-project-sheet-button'

export default function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([])

  const fetchProjects = () => {
    fetch('/api/projects')
      .then(res => res.ok ? res.json() : [])
      .then(data => setProjects(Array.isArray(data) ? data : []))
      .catch(() => setProjects([]))
  }

  useEffect(() => {
    fetchProjects()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Tất cả show chụp</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Xem và quản lý tất cả show chụp chọn ảnh của bạn
          </p>
        </div>
        <NewProjectSheetButton className="shrink-0" />
      </div>

      <ProjectsTable projects={projects} onRefresh={fetchProjects} />
    </div>
  )
}

