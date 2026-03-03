export type TaskStatus = 'Pending' | 'In Progress' | 'Completed' | 'Not Completed'

export interface Task {
  id: string
  title: string
  description?: string
  status: TaskStatus
  createdAt: string // ISO string
  updatedAt: string // ISO string
  completedAt?: string // ISO string
}

export interface DailySummary {
  date: string // YYYY-MM-DD
  totalCreated: number
  totalCompleted: number
  totalPendingEndOfDay: number
  completionPercentage: number
  generatedAt: string // ISO string
}

