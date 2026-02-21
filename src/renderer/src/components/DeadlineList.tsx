import { useState, useEffect } from 'react'
import { ArrowLeft, AlertCircle } from 'lucide-react'
import { TaskList, CalendarEvent, PlannerSettings, Deadline } from '../types'
import { useDeadlines } from '../hooks/useDeadlines'
import { useSubtaskGenerator } from '../hooks/useSubtaskGenerator'
import { DeadlineItem } from './DeadlineItem'
import { WorkBackwardsView } from './WorkBackwardsView'

interface DeadlineListProps {
  signedIn: boolean
  taskLists: TaskList[]
  onBack: () => void
}

export function DeadlineList({ signedIn, taskLists, onBack }: DeadlineListProps) {
  const { deadlines, loading, error, refresh } = useDeadlines(signedIn, taskLists)
  const {
    subtasks,
    schedule,
    state: genState,
    error: genError,
    generate,
    planBackwards,
    reset: resetGen
  } = useSubtaskGenerator()

  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [activeDeadline, setActiveDeadline] = useState<Deadline | null>(null)
  const [showWorkBackwards, setShowWorkBackwards] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [settings, setSettings] = useState<PlannerSettings | null>(null)
  const [events, setEvents] = useState<CalendarEvent[]>([])

  useEffect(() => {
    window.api.getPlannerSettings().then((result) => {
      if (result.success && result.data) {
        setSettings(result.data)
      }
    })
  }, [])

  // Fetch today's events for work-backwards scheduling
  useEffect(() => {
    if (!signedIn) return
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const end = new Date(start)
    end.setDate(end.getDate() + 14)
    window.api
      .getCalendarEvents('primary', start.toISOString(), end.toISOString())
      .then((result) => {
        if (result.success && result.data) {
          setEvents(result.data)
        }
      })
  }, [signedIn])

  const handleToggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  const handleGenerateSubtasks = async (deadline: Deadline) => {
    setActiveDeadline(deadline)
    setShowWorkBackwards(false)
    await generate(deadline.title, undefined, deadline.dueDate)
  }

  const handleWorkBackwards = async (deadline: Deadline) => {
    if (!settings) return
    setActiveDeadline(deadline)
    setShowWorkBackwards(true)
    await planBackwards(
      deadline.title,
      undefined,
      deadline.dueDate,
      events,
      { start: settings.workingHoursStart, end: settings.workingHoursEnd },
      settings.breakDurationMinutes,
      { start: settings.lunchBreakStart, end: settings.lunchBreakEnd }
    )
  }

  const handleConfirmSchedule = async () => {
    if (!settings || schedule.length === 0) return
    setConfirming(true)
    try {
      const calendarId = settings.defaultCalendarId || 'primary'
      for (const item of schedule) {
        await window.api.createCalendarEvent(calendarId, {
          summary: item.subtaskTitle,
          start: `${item.date}T${item.start}:00`,
          end: `${item.date}T${item.end}:00`,
          description: activeDeadline ? `Part of: ${activeDeadline.title}` : undefined
        })
      }
      resetGen()
      setShowWorkBackwards(false)
      setActiveDeadline(null)
      refresh()
    } catch {
      // Error handling is via genError state
    } finally {
      setConfirming(false)
    }
  }

  const handleCancelWorkBackwards = () => {
    resetGen()
    setShowWorkBackwards(false)
    setActiveDeadline(null)
  }

  // Show work-backwards result view when schedule is available
  if (showWorkBackwards && genState === 'done' && schedule.length > 0) {
    return (
      <div className="deadline-list">
        <div className="deadline-list-header">
          <button className="icon-btn" onClick={handleCancelWorkBackwards}>
            <ArrowLeft size={16} />
          </button>
          <span className="deadline-list-title">
            {activeDeadline?.title || 'Work Backwards'}
          </span>
        </div>
        <div className="deadline-list-content">
          <WorkBackwardsView
            schedule={schedule}
            subtasks={subtasks}
            onConfirm={handleConfirmSchedule}
            onCancel={handleCancelWorkBackwards}
            confirming={confirming}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="deadline-list">
      <div className="deadline-list-header">
        <button className="icon-btn" onClick={onBack}>
          <ArrowLeft size={16} />
        </button>
        <span className="deadline-list-title">All Deadlines</span>
      </div>

      {error && (
        <div className="plan-error-card">
          <AlertCircle size={16} />
          <span>{error}</span>
          <button className="plan-error-retry" onClick={refresh}>
            Retry
          </button>
        </div>
      )}

      {genError && (
        <div className="plan-error-card" style={{ margin: '0 14px' }}>
          <AlertCircle size={16} />
          <span>{genError}</span>
          <button className="plan-error-retry" onClick={resetGen}>
            Dismiss
          </button>
        </div>
      )}

      {loading ? (
        <div className="plan-generating">
          <div className="spinner" />
          <span>Loading deadlines...</span>
        </div>
      ) : (
        <div className="deadline-list-content">
          {deadlines.length === 0 ? (
            <div className="deadline-list-empty">
              <span>No upcoming deadlines</span>
            </div>
          ) : (
            deadlines.map((d) => (
              <DeadlineItem
                key={d.id}
                deadline={d}
                expanded={expandedId === d.id}
                onToggleExpand={() => handleToggleExpand(d.id)}
                onGenerateSubtasks={handleGenerateSubtasks}
                onWorkBackwards={handleWorkBackwards}
                generating={genState === 'generating' && activeDeadline?.id === d.id}
              />
            ))
          )}

          {/* Show generated subtasks inline when not in work-backwards mode */}
          {!showWorkBackwards && genState === 'done' && subtasks.length > 0 && activeDeadline && (
            <div className="deadline-generated-panel">
              <div className="deadline-generated-label">
                Generated subtasks for: {activeDeadline.title}
              </div>
              {subtasks.map((st, i) => (
                <div key={i} className="deadline-generated-subtask">
                  <span>{st.title}</span>
                  <span className="deadline-generated-est">{st.estimatedMinutes}m</span>
                </div>
              ))}
              <button className="plan-reset-btn" onClick={resetGen}>
                Dismiss
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
