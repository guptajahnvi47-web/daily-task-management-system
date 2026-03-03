import { useEffect, useState } from 'react'
import type { Task, DailySummary } from '../types'
import { TaskList } from './TaskList'
import { getTodayISODate, toISODate } from '../utils/date'
import {
  fetchDailySummary,
  fetchHistoryDates,
  fetchHistoryTasks,
  fetchTasks,
} from '../services/api'

export function HistoryView() {
  const [selectedDate, setSelectedDate] = useState(getTodayISODate())
  const [availableDates, setAvailableDates] = useState<string[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [summary, setSummary] = useState<DailySummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchHistoryDates()
      .then((dates) => setAvailableDates(dates))
      .catch((err) => {
        console.error(err)
        setAvailableDates([])
      })
  }, [])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)

    const load = async () => {
      try {
        const isToday = selectedDate === getTodayISODate()
        const [tasksData, summaryData] = await Promise.all([
          isToday ? fetchTasks(selectedDate) : fetchHistoryTasks(selectedDate),
          fetchDailySummary(selectedDate),
        ])
        if (!active) return
        setTasks(tasksData)
        setSummary(summaryData)
      } catch (err) {
        console.error(err)
        if (!active) return
        setError('Failed to load historical data from server.')
        setTasks([])
        setSummary(null)
      } finally {
        if (!active) return
        setLoading(false)
      }
    }

    load()

    return () => {
      active = false
    }
  }, [selectedDate])

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(toISODate(e.target.value))
  }

  return (
    <section>
      <div className="section-header">
        <div>
          <h2>Historical View</h2>
          <p className="muted">
            Browse tasks and end-of-day summaries for any date. Historical data is read-only.
          </p>
        </div>
        <div className="history-controls card">
          <label>
            <span className="field-label">Select date</span>
            <input
              type="date"
              value={selectedDate}
              max={getTodayISODate()}
              onChange={handleDateChange}
            />
          </label>
          {availableDates.length > 0 && (
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="date-select"
            >
              {availableDates.map((d) => (
                <option key={d} value={d}>
                  {new Date(d).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {error && <p className="error-text">{error}</p>}

      {summary && (
        <div className="card summary-card">
          <h3>Daily Summary</h3>
          <div className="summary-grid">
            <div>
              <span className="stats-label">Tasks Created</span>
              <span className="stats-value">{summary.totalCreated}</span>
            </div>
            <div>
              <span className="stats-label">Tasks Completed</span>
              <span className="stats-value">{summary.totalCompleted}</span>
            </div>
            <div>
              <span className="stats-label">Pending EOD</span>
              <span className="stats-value">{summary.totalPendingEndOfDay}</span>
            </div>
            <div>
              <span className="stats-label">Completion</span>
              <span className="stats-value">{summary.completionPercentage}%</span>
            </div>
          </div>
          <p className="muted">
            Summary generated at{' '}
            {new Date(summary.generatedAt).toLocaleString(undefined, {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </p>
        </div>
      )}

      {loading ? (
        <p className="muted" style={{ marginTop: '1rem' }}>
          Loading tasks...
        </p>
      ) : (
        <TaskList tasks={tasks} onEdit={() => {}} onDelete={() => {}} />
      )}
    </section>
  )
}

