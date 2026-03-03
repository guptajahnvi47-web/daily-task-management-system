import type { Task, DailySummary } from '../types'
import { getTodayISODate } from '../utils/date'

const API_BASE = 'http://localhost:4000'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
    ...options,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || res.statusText)
  }

  return (await res.json()) as T
}

export async function fetchTasks(date?: string): Promise<Task[]> {
  const dateKey = date ?? getTodayISODate()
  const data = await request<any[]>(`/tasks?date=${encodeURIComponent(dateKey)}`)
  return data.map(normalizeTask)
}

export async function fetchHistoryTasks(date: string): Promise<Task[]> {
  const data = await request<any[]>(`/history/tasks?date=${encodeURIComponent(date)}`)
  return data.map(normalizeTask)
}

export async function createTask(payload: {
  title: string
  description?: string
  status: Task['status']
}): Promise<Task> {
  const apiStatus = toApiStatus(payload.status)
  const data = await request<any>('/tasks', {
    method: 'POST',
    body: JSON.stringify({ ...payload, status: apiStatus }),
  })
  return normalizeTask(data)
}

export async function updateTask(
  id: string,
  payload: { title?: string; description?: string; status?: Task['status'] },
): Promise<Task> {
  const apiStatus = payload.status ? toApiStatus(payload.status) : undefined
  const data = await request<any>(`/tasks/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ ...payload, status: apiStatus }),
  })
  return normalizeTask(data)
}

export async function deleteTask(id: string): Promise<void> {
  await request<void>(`/tasks/${id}`, { method: 'DELETE' })
}

export async function fetchDailySummary(date: string): Promise<DailySummary | null> {
  try {
    const raw = await request<any>(`/summaries/${encodeURIComponent(date)}`)
    return {
      date: raw.dateKey,
      totalCreated: raw.totalCreated,
      totalCompleted: raw.totalCompleted,
      totalPendingEndOfDay: raw.totalPendingEndOfDay,
      completionPercentage: raw.completionPercentage,
      generatedAt: raw.generatedAt,
    }
  } catch {
    return null
  }
}

export async function fetchHistoryDates(): Promise<string[]> {
  return request<string[]>('/history/dates')
}

function normalizeTask(raw: any): Task {
  return {
    id: raw.id,
    title: raw.title,
    description: raw.description ?? undefined,
    status: fromApiStatus(raw.status),
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    completedAt: raw.completedAt ?? undefined,
  }
}

function toApiStatus(status: Task['status']): 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'NOT_COMPLETED' {
  switch (status) {
    case 'Pending':
      return 'PENDING'
    case 'In Progress':
      return 'IN_PROGRESS'
    case 'Completed':
      return 'COMPLETED'
    case 'Not Completed':
      return 'NOT_COMPLETED'
  }
}

function fromApiStatus(status: string): Task['status'] {
  switch (status) {
    case 'PENDING':
      return 'Pending'
    case 'IN_PROGRESS':
      return 'In Progress'
    case 'COMPLETED':
      return 'Completed'
    case 'NOT_COMPLETED':
      return 'Not Completed'
    default:
      return 'Pending'
  }
}

