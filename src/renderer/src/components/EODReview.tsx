import { useState, useEffect, useMemo } from 'react'
import { X, CheckCircle2, ArrowRight, Calendar, Smile } from 'lucide-react'
import { Task, TaskList, FocusSession } from '../types'

interface EODReviewProps {
  signedIn: boolean
  taskLists: TaskList[]
  onDismiss: () => void
  onUpdateTask: (taskId: string, updates: { due?: string | null }) => void
}

const MOOD_EMOJIS = [
  { value: 1, emoji: '\uD83D\uDE29', label: 'Terrible' },
  { value: 2, emoji: '\uD83D\uDE14', label: 'Bad' },
  { value: 3, emoji: '\uD83D\uDE10', label: 'Okay' },
  { value: 4, emoji: '\uD83D\uDE0A', label: 'Good' },
  { value: 5, emoji: '\uD83E\uDD29', label: 'Great' }
]

const REFLECTION_PROMPTS = [
  'What was your biggest win today?',
  'What would you do differently?',
  'What are you grateful for today?',
  'What gave you energy today?',
  'What drained your energy?',
  'What will you prioritize tomorrow?',
  'What did you learn today?'
]

function flattenTasks(tasks: Task[]): Task[] {
  const flat: Task[] = []
  for (const t of tasks) {
    flat.push(t)
    if (t.children) flat.push(...flattenTasks(t.children))
  }
  return flat
}

export function EODReview({ signedIn, taskLists, onDismiss, onUpdateTask }: EODReviewProps) {
  const [allTasks, setAllTasks] = useState<Task[]>([])
  const [todaySessions, setTodaySessions] = useState<FocusSession[]>([])
  const [loading, setLoading] = useState(true)
  const [rating, setRating] = useState(0)
  const [reflection, setReflection] = useState('')
  const [saving, setSaving] = useState(false)

  const [reflectionPrompt] = useState(
    REFLECTION_PROMPTS[Math.floor(Math.random() * REFLECTION_PROMPTS.length)]
  )

  useEffect(() => {
    if (!signedIn) return
    let cancelled = false

    ;(async () => {
      const tasks: Task[] = []
      for (const list of taskLists) {
        const result = await window.api.getTasks(list.id)
        if (result?.data) tasks.push(...result.data)
      }
      const sessionsResult = await window.api.getFocusTodaySessions()
      if (!cancelled) {
        setAllTasks(tasks)
        setTodaySessions(sessionsResult?.data || [])
        setLoading(false)
      }
    })()

    return () => { cancelled = true }
  }, [signedIn, taskLists])

  const flat = useMemo(() => flattenTasks(allTasks), [allTasks])
  const today = new Date().toISOString().split('T')[0]

  const completedToday = useMemo(
    () => flat.filter((t) => t.status === 'completed' && t.completed?.startsWith(today)),
    [flat, today]
  )

  const carriedOver = useMemo(
    () => flat.filter((t) => t.status !== 'completed' && t.due && t.due.split('T')[0] <= today),
    [flat, today]
  )

  const focusMinutes = useMemo(
    () => todaySessions.reduce((sum, s) => sum + s.durationMinutes, 0),
    [todaySessions]
  )

  const handleRescheduleTomorrow = (taskId: string) => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    onUpdateTask(taskId, { due: tomorrow.toISOString().split('T')[0] })
  }

  const handleFinish = async () => {
    setSaving(true)
    await window.api.eodSave({
      date: today,
      rating,
      reflection,
      completedCount: completedToday.length,
      carriedOverCount: carriedOver.length,
      focusMinutes
    })
    setSaving(false)
    onDismiss()
  }

  if (loading) {
    return (
      <div className="focus-overlay eod-overlay">
        <div className="focus-loading">
          <div className="spinner" />
        </div>
      </div>
    )
  }

  return (
    <div className="focus-overlay eod-overlay">
      <button className="focus-exit-btn" onClick={onDismiss} title="Close">
        <X size={18} />
      </button>

      <div className="eod-content">
        <h2 className="eod-title">End of Day Review</h2>

        {/* Completed tasks */}
        <div className="eod-section">
          <div className="eod-section-header">
            <CheckCircle2 size={14} />
            <span>Completed Today ({completedToday.length})</span>
          </div>
          {completedToday.length === 0 ? (
            <div className="eod-empty">No tasks completed today</div>
          ) : (
            <div className="eod-task-list">
              {completedToday.slice(0, 8).map((t) => (
                <div key={t.id} className="eod-task-item completed">
                  <CheckCircle2 size={12} className="stat-icon-success" />
                  <span>{t.title}</span>
                </div>
              ))}
              {completedToday.length > 8 && (
                <div className="eod-more">+{completedToday.length - 8} more</div>
              )}
            </div>
          )}
        </div>

        {/* Carried over */}
        {carriedOver.length > 0 && (
          <div className="eod-section">
            <div className="eod-section-header">
              <ArrowRight size={14} />
              <span>Carrying Over ({carriedOver.length})</span>
            </div>
            <div className="eod-task-list">
              {carriedOver.slice(0, 6).map((t) => (
                <div key={t.id} className="eod-task-item carried">
                  <span className="eod-carried-title">{t.title}</span>
                  <button
                    className="weekly-reschedule-btn"
                    onClick={() => handleRescheduleTomorrow(t.id)}
                  >
                    <Calendar size={10} />
                    Tomorrow
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats row */}
        <div className="eod-stats">
          <div className="eod-stat">
            <span className="eod-stat-value">{completedToday.length}</span>
            <span className="eod-stat-label">done</span>
          </div>
          <div className="eod-stat">
            <span className="eod-stat-value">{focusMinutes}</span>
            <span className="eod-stat-label">min focused</span>
          </div>
          <div className="eod-stat">
            <span className="eod-stat-value">{todaySessions.length}</span>
            <span className="eod-stat-label">sessions</span>
          </div>
        </div>

        {/* Mood rating */}
        <div className="eod-section">
          <div className="eod-section-header">
            <Smile size={14} />
            <span>How was your day?</span>
          </div>
          <div className="eod-mood-picker">
            {MOOD_EMOJIS.map((m) => (
              <button
                key={m.value}
                className={`eod-mood-btn ${rating === m.value ? 'active' : ''}`}
                onClick={() => setRating(m.value)}
                title={m.label}
              >
                <span className="eod-mood-emoji">{m.emoji}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Reflection */}
        <div className="eod-section">
          <div className="eod-reflection-prompt">{reflectionPrompt}</div>
          <textarea
            className="eod-reflection-input"
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            placeholder="Type your thoughts..."
            rows={2}
          />
        </div>

        {/* Save */}
        <button
          className="plan-generate-btn eod-finish-btn"
          onClick={handleFinish}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Finish My Day'}
        </button>
      </div>
    </div>
  )
}
