import type { Task } from '../types'
import { format } from '../utils/date'

interface TaskListProps {
  tasks: Task[]
  onEdit: (task: Task) => void
  onDelete: (task: Task) => void
}

function statusClass(status: Task['status']): string {
  switch (status) {
    case 'Pending':
      return 'status-pending'
    case 'In Progress':
      return 'status-in-progress'
    case 'Completed':
      return 'status-completed'
    case 'Not Completed':
      return 'status-not-completed'
  }
}

export function TaskList({ tasks, onEdit, onDelete }: TaskListProps) {
  if (tasks.length === 0) {
    return <p className="empty-state">No tasks yet for this date.</p>
  }

  return (
    <div className="task-list">
      {tasks.map((task) => (
        <article key={task.id} className="card task-card">
          <header className="task-card-header">
            <div>
              <h3>{task.title}</h3>
              <span className={`status-pill ${statusClass(task.status)}`}>
                {task.status}
              </span>
            </div>
            <div className="task-card-meta">
              <span>Created: {format(task.createdAt)}</span>
              <span>Updated: {format(task.updatedAt)}</span>
            </div>
          </header>
          {task.description && <p className="task-description">{task.description}</p>}
          <footer className="task-card-footer">
            <button className="secondary" onClick={() => onEdit(task)}>
              Edit
            </button>
            <button className="danger" onClick={() => onDelete(task)}>
              Delete
            </button>
          </footer>
        </article>
      ))}
    </div>
  )
}

