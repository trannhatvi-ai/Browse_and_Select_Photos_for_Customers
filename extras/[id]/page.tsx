import { ProjectDetail } from "@/components/project-detail"
import { mockProjects, mockPhotos } from "@/lib/mock-data"
import { notFound } from "next/navigation"

interface ProjectDetailPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { id } = await params
  const project = mockProjects.find((p) => p.id === id)

  if (!project) {
    notFound()
  }

  // For demo, use first 4 photos
  const projectPhotos = mockPhotos.slice(0, 4)

  return <ProjectDetail project={project} photos={projectPhotos} />
}

export async function generateStaticParams() {
  return mockProjects.map((project) => ({
    id: project.id,
  }))
}
