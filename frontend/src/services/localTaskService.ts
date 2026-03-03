import type { DailySummary, Task } from '../types'
import { getTodayISODate, toISODate } from '../utils/date'

const TASKS_KEY_PREFIX = 'daily-tasks-'
const SUMMARY_KEY_PREFIX = 'daily-summary-'

function keyForTasks(date: string) {
  return `${TASKS_KEY_PREFIX}${toISODate(date)}`
}

function keyForSummary(date: string) {
  return `${SUMMARY_KEY_PREFIX}${toISODate(date)}`
}

export function loadTasksForDate(date: string): Task[] {
  if (typeof window === 'undefined') return []
  const raw = window.localStorage.getItem(keyForTasks(date))
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as Task[]
    return parsed.map((t) => ({
      ...t,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      completedAt: t.completedAt,
    }))
  } catch {
    return []
  }
}

export function saveTasksForDate(date: string, tasks: Task[]): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(keyForTasks(date), JSON.stringify(tasks))
}

export function loadSummaryForDate(date: string): DailySummary | null {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(keyForSummary(date))
  if (!raw) return null
  try {
    return JSON.parse(raw) as DailySummary
  } catch {
    return null
  }
}

export function saveSummaryForTodayFromTasks(tasks: Task[]): DailySummary {
  const today = getTodayISODate()
  const totalCreated = tasks.length
  const totalCompleted = tasks.filter((t) => t.status === 'Completed').length
  const totalPendingEndOfDay = tasks.filter((t) => t.status !== 'Completed').length
  const completionPercentage =
    totalCreated === 0 ? 0 : Math.round((totalCompleted / totalCreated) * 100)

  const summary: DailySummary = {
    date: today,
    totalCreated,
    totalCompleted,
    totalPendingEndOfDay,
    completionPercentage,
    generatedAt: new Date().toISOString(),
  }

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(keyForSummary(today), JSON.stringify(summary))
  }

  return summary
}

export function loadAllDates(): string[] {
  if (typeof window === 'undefined') return []
  const dates = new Set<string>()
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i)
    if (!key) continue
    if (key.startsWith(TASKS_KEY_PREFIX)) {
      dates.add(key.replace(TASKS_KEY_PREFIX, ''))
    }
    if (key.startsWith(SUMMARY_KEY_PREFIX)) {
      dates.add(key.replace(SUMMARY_KEY_PREFIX, ''))
    }
  }
  return Array.from(dates).sort((a, b) => (a < b ? 1 : -1))
}

