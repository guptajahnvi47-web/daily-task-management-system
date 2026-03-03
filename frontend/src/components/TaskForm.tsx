import { FormEvent, useState } from 'react'
import type { TaskStatus, Task } from '../types'

interface TaskFormProps {
  initial?: Partial<Task>
  onSubmit: (data: {
    title: string
    description: string
    status: TaskStatus
  }) => void
  onCancel?: () => void
}

const statusOptions: TaskStatus[] = ['Pending', 'In Progress', 'Completed', 'Not Completed']

export function TaskForm({ initial, onSubmit, onCancel }: TaskFormProps) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [status, setStatus] = useState<TaskStatus>(initial?.status ?? 'Pending')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('Title is required')
      return
    }
    setError(null)
    onSubmit({ title: title.trim(), description: description.trim(), status })
  }

  return (
    <form className="card task-form" onSubmit={handleSubmit}>
      <div className="field-group">
        <label htmlFor="title">Title *</label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What do you need to get done?"
        />
      </div>

      <div className="field-group">
        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add optional context, acceptance criteria, or notes."
          rows={3}
        />
      </div>

      <div className="field-group">
        <label htmlFor="status">Status</label>
        <select
          id="status"
          value={status}
          onChange={(e) => setStatus(e.target.value as TaskStatus)}
        >
          {statusOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="form-actions">
        {onCancel && (
          <button type="button" className="secondary" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button type="submit" className="primary">
          {initial?.id ? 'Update Task' : 'Add Task'}
        </button>
      </div>
    </form>
  )
}

