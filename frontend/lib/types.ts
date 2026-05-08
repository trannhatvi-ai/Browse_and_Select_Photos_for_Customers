export interface Photo {
  id: string
  src: string
  filename: string
  date: string
  selected: boolean
  comment?: string
  aiContext?: Record<string, unknown> | null
  // Optional AI metadata
  aiGroupId?: string
  aiBestShot?: boolean
  aiGroupSize?: number
}

export interface Project {
  id: string
  clientName: string
  clientEmail: string
  eventName: string
  eventDate: string
  status: 'CHOOSING' | 'DONE'
  deadline: string
  photoCount: number
  selectedCount: number
  maxSelections: number
  accessToken?: string
}

export interface StatsData {
  totalProjects: number
  pendingReview: number
  completed: number
  storageUsed: string
}
