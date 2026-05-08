export interface Photo {
  id: string
  src: string
  originalUrl?: string | null
  filename: string
  date: string
  selected: boolean
  comment?: string
  aiContext?: Record<string, unknown> | null
  // Optional AI metadata
  aiGroupId?: string
  aiBestShot?: boolean
  aiGroupSize?: number
  // For search result matching
  url_hash?: string | null
  score?: number
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
