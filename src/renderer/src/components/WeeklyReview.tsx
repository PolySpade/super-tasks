import { useState, useEffect, useMemo } from 'react'
import { ArrowLeft, CheckCircle2, AlertCircle, Calendar, Clock, ChevronRight, Target, Smile } from 'lucide-react'
import { Task, TaskList, FocusSession, TaskMetadata } from '../types'
import { parseMetaTag } from '../utils/task-meta'

interface WeeklyReviewProps {
  signedIn: boolean
  taskLists: TaskList[]
  onBack: () => void
  onSelectTask: (task: Task) => void
  onUpdateTask: (taskId: string, updates: { due?: string | null }) => void
}

function flattenTasks(tasks: Task[]): Task[] {
  const flat: Task[] = []
  for (const t of tasks) {
    flat.push(t)
    if (t.children) flat.push(...flattenTasks(t.children))
  }
  return flat
}

function getWeekDates(): { start: Date; end: Date; days: string[] } {
  const now = new Date()
  const start = new Date(now)
  start.setDate(start.getDate() - 7)
  start.setHours(0, 0, 0, 0)
  const end = new Date(now)
  end.setHours(23, 59, 59, 999)

  const days: string[] = []
  const d = new Date(start)
  while (d <= end) {
    days.push(d.toISOString().split('T')[0])
    d.setDate(d.getDate() + 1)
  }
  return { start, end, days }
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export function WeeklyReview({ signedIn, taskLists, onBack, onSelectTask, onUpdateTask }: WeeklyReviewProps) {
  const [allTasks, setAllTasks] = useState<Task[]>([])
  const [weekSessions, setWeekSessions] = useState<FocusSession[]>([])
  const [loading, setLoading] = useState(true)
  const [estimationAccuracy, setEstimationAccuracy] = useState<number | null>(null)
  const [avgMood, setAvgMood] = useState<number | null>(null)
  const [weekReflections, setWeekReflections] = useState<{ date: string; reflection: string; rating: number }[]>([])

  useEffect(() => {
    if (!signedIn) return
    let cancelled = false

    ;(async () => {
      setLoading(true)
      const tasks: Task[] = []
      for (const list of taskLists) {
        const result = await window.api.getTasks(list.id)
        if (result?.data) tasks.push(...result.data)
      }

      const sessionsResult = await window.api.getFocusWeekSessions()

      // Calculate estimation accuracy from time tracking + metadata parsed from notes
      const timeResult = await window.api.getAllTimeTracking()

      if (!cancelled) {
        setAllTasks(tasks)
        setWeekSessions(sessionsResult?.data || [])

        // Build metadata map from fetched tasks
        const allFlat = flattenTasks(tasks)
        const metaData: Record<string, TaskMetadata> = {}
        for (const t of allFlat) {
          const { meta } = parseMetaTag(t.notes || '')
          if (meta.timeBoxMinutes) {
            metaData[t.id] = meta
          }
        }

        // Compute accuracy: tasks with both estimate and actual
        if (timeResult?.data) {
          const timeData = timeResult.data as Record<string, { totalMinutes: number }>
          let totalRatio = 0
          let count = 0
          for (const [taskId, td] of Object.entries(timeData)) {
            const est = metaData[taskId]?.timeBoxMinutes
            if (est && est > 0 && td.totalMinutes > 0) {
              totalRatio += Math.min(est / td.totalMinutes, td.totalMinutes / est)
              count++
            }
          }
          setEstimationAccuracy(count > 0 ? Math.round((totalRatio / count) * 100) : null)
        }

        // Load EOD review data
        const [avgResult, recentResult] = await Promise.all([
          window.api.eodGetAverageRating(7),
          window.api.eodGetRecent(7)
        ])
        if (!cancelled) {
          if (avgResult?.data !== undefined) setAvgMood(avgResult.data)
          if (recentResult?.data) {
            setWeekReflections(
              recentResult.data
                .filter((r: any) => r.reflection)
                .map((r: any) => ({ date: r.date, reflection: r.reflection, rating: r.rating }))
            )
          }
        }

        setLoading(false)
      }
    })()

    return () => { cancelled = true }
  }, [signedIn, taskLists])

  const { days } = getWeekDates()
  const flat = useMemo(() => flattenTasks(allTasks), [allTasks])

  // Completed tasks this week, grouped by day
  const completedByDay = useMemo(() => {
    const map: Record<string, Task[]> = {}
    for (const day of days) map[day] = []
    for (const t of flat) {
      if (t.status === 'completed' && t.completed) {
        const dayKey = t.completed.split('T')[0]
        if (map[dayKey]) map[dayKey].push(t)
      }
    }
    return map
  }, [flat, days])

  const totalCompleted = useMemo(() => {
    return Object.values(completedByDay).reduce((sum, arr) => sum + arr.length, 0)
  }, [completedByDay])

  // Carried-over: incomplete tasks with past due dates
  const carriedOver = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    return flat.filter((t) => {
      if (t.status === 'completed') return false
      if (!t.due) return false
      return t.due.split('T')[0] < today
    })
  }, [flat])

  // Focus stats
  const focusMinutes = useMemo(() => {
    return weekSessions.reduce((sum, s) => sum + s.durationMinutes, 0)
  }, [weekSessions])

  const handleRescheduleToMonday = (taskId: string) => {
    const next = new Date()
    const day = next.getDay()
    const daysUntilMonday = day === 0 ? 1 : 8 - day
    next.setDate(next.getDate() + daysUntilMonday)
    const mondayStr = next.toISOString().split('T')[0]
    onUpdateTask(taskId, { due: mondayStr })
  }

  const handleBulkMoveToMonday = () => {
    for (const task of carriedOver) {
      handleRescheduleToMonday(task.id)
    }
  }

  if (loading) {
    return (
      <div className="weekly-review">
        <div className="plan-generating">
          <div className="spinner" />
          <span>Loading weekly review...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="weekly-review">
      <div className="weekly-review-content">
        {/* Summary */}
        <div className="weekly-summary">
          <h3 className="weekly-summary-title">Week in Review</h3>
          <div className="weekly-summary-stats">
            <div className="weekly-summary-stat">
              <CheckCircle2 size={16} className="stat-icon-success" />
              <span className="weekly-stat-value">{totalCompleted}</span>
              <span className="weekly-stat-label">completed</span>
            </div>
            <div className="weekly-summary-stat">
              <Clock size={16} className="stat-icon-accent" />
              <span className="weekly-stat-value">{focusMinutes}</span>
              <span className="weekly-stat-label">min focused</span>
            </div>
            <div className="weekly-summary-stat">
              <AlertCircle size={16} className="stat-icon-warning" />
              <span className="weekly-stat-value">{carriedOver.length}</span>
              <span className="weekly-stat-label">carried over</span>
            </div>
            {estimationAccuracy !== null && (
              <div className="weekly-summary-stat">
                <Target size={16} className="stat-icon-accent" />
                <span className="weekly-stat-value">{estimationAccuracy}%</span>
                <span className="weekly-stat-label">est. accuracy</span>
              </div>
            )}
            {avgMood !== null && (
              <div className="weekly-summary-stat">
                <Smile size={16} className="stat-icon-warning" />
                <span className="weekly-stat-value">{avgMood.toFixed(1)}</span>
                <span className="weekly-stat-label">avg mood</span>
              </div>
            )}
          </div>
        </div>

        {/* Completed this week */}
        <div className="weekly-section">
          <div className="weekly-section-header">
            <CheckCircle2 size={14} />
            <span>Completed This Week</span>
          </div>
          {totalCompleted === 0 ? (
            <div className="weekly-empty">No tasks completed this week</div>
          ) : (
            days.filter((day) => completedByDay[day]?.length > 0).reverse().map((day) => (
              <div key={day} className="weekly-day-group">
                <div className="weekly-day-label">{formatDate(day)}</div>
                {completedByDay[day].map((task) => (
                  <div
                    key={task.id}
                    className="weekly-task-item"
                    onClick={() => onSelectTask(task)}
                  >
                    <CheckCircle2 size={12} className="stat-icon-success" />
                    <span>{task.title}</span>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>

        {/* Carried Over */}
        {carriedOver.length > 0 && (
          <div className="weekly-section">
            <div className="weekly-section-header">
              <AlertCircle size={14} />
              <span>Carried Over ({carriedOver.length})</span>
            </div>
            {carriedOver.map((task) => (
              <div key={task.id} className="weekly-task-item weekly-carried">
                <span className="weekly-carried-title" onClick={() => onSelectTask(task)}>
                  {task.title}
                </span>
                <button
                  className="weekly-reschedule-btn"
                  onClick={() => handleRescheduleToMonday(task.id)}
                >
                  <Calendar size={10} />
                  Mon
                </button>
              </div>
            ))}
            <button className="weekly-bulk-btn" onClick={handleBulkMoveToMonday}>
              Move all to Monday
              <ChevronRight size={12} />
            </button>
          </div>
        )}

        {/* Weekly reflections */}
        {weekReflections.length > 0 && (
          <div className="weekly-section">
            <div className="weekly-section-header">
              <Smile size={14} />
              <span>Reflections</span>
            </div>
            {weekReflections.map((r) => (
              <div key={r.date} className="weekly-reflection-item">
                <span className="weekly-reflection-date">{formatDate(r.date)}</span>
                <span className="weekly-reflection-text">{r.reflection}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
