import { useEffect, useMemo, useState } from 'react'
import type { Task } from '../types'
import { TaskForm } from './TaskForm'
import { TaskList } from './TaskList'
import { getTodayISODate, isSameDate } from '../utils/date'
import { createTask, deleteTask, fetchTasks, updateTask } from '../services/api'

export function DailyBoard() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [editing, setEditing] = useState<Task | null>(null)
  const [currentDate] = useState(getTodayISODate())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)

    fetchTasks(currentDate)
      .then((data) => {
        if (!active) return
        setTasks(data)
      })
      .catch((err) => {
        if (!active) return
        console.error(err)
        setError('Failed to load tasks from server.')
      })
      .finally(() => {
        if (!active) return
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [currentDate])

  const stats = useMemo(() => {
    const total = tasks.length
    const completed = tasks.filter((t) => t.status === 'Completed').length
    const pending = tasks.filter((t) => t.status !== 'Completed').length
    const completionPercentage = total === 0 ? 0 : Math.round((completed / total) * 100)
    return { total, completed, pending, completionPercentage }
  }, [tasks])

  const handleCreate = async (data: {
    title: string
    description: string
    status: Task['status']
  }) => {
    try {
      const created = await createTask(data)
      setTasks((prev) => [created, ...prev])
    } catch (err) {
      console.error(err)
      setError('Failed to create task. Please try again.')
    }
  }

  const handleUpdate = async (data: {
    title: string
    description: string
    status: Task['status']
  }) => {
    if (!editing) return
    try {
      const updated = await updateTask(editing.id, data)
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
      setEditing(null)
    } catch (err) {
      console.error(err)
      setError('Failed to update task. Please try again.')
    }
  }

  const handleDelete = async (task: Task) => {
    if (!window.confirm(`Delete task "${task.title}"?`)) return
    try {
      await deleteTask(task.id)
      setTasks((prev) => prev.filter((t) => t.id !== task.id))
    } catch (err) {
      console.error(err)
      setError('Failed to delete task. Please try again.')
    }
  }

  const todayLabel = useMemo(
    () => new Date(currentDate).toLocaleDateString(undefined, { dateStyle: 'full' }),
    [currentDate],
  )

  const isToday = isSameDate(currentDate, getTodayISODate())

  return (
    <section>
      <div className="section-header">
        <div>
          <h2>Today&apos;s Board</h2>
          <p className="muted">
            Showing tasks created on {todayLabel}. Tasks from other days will appear in History.
          </p>
        </div>
        <div className="stats-card card">
          <div>
            <span className="stats-label">Created</span>
            <span className="stats-value">{stats.total}</span>
          </div>
          <div>
            <span className="stats-label">Completed</span>
            <span className="stats-value">{stats.completed}</span>
          </div>
          <div>
            <span className="stats-label">Pending</span>
            <span className="stats-value">{stats.pending}</span>
          </div>
          <div>
            <span className="stats-label">Completion</span>
            <span className="stats-value">{stats.completionPercentage}%</span>
          </div>
        </div>
      </div>

      {!isToday && (
        <p className="warning-banner">
          This board is read-only for past dates. EOD processing would have already run.
        </p>
      )}

      {error && <p className="error-text">{error}</p>}

      {isToday && (
        <TaskForm
          key={editing?.id ?? 'create'}
          initial={editing ?? undefined}
          onSubmit={editing ? handleUpdate : handleCreate}
          onCancel={editing ? () => setEditing(null) : undefined}
        />
      )}

      {loading ? (
        <p className="muted" style={{ marginTop: '1rem' }}>
          Loading tasks...
        </p>
      ) : (
        <TaskList tasks={tasks} onEdit={setEditing} onDelete={handleDelete} />
      )}
    </section>
  )
}

