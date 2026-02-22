import { useState, useEffect, useMemo } from 'react'
import { X, ChevronRight, ChevronLeft, Trash2, Sparkles, Calendar, Zap, Trophy, ChevronDown } from 'lucide-react'
import { Task, TaskList, TaskMetadata, EnergyLevel } from '../types'
import { MITSection } from './MITSection'

interface DailyRitualProps {
  signedIn: boolean
  taskLists: TaskList[]
  mits: string[]
  onSetMITs: (taskIds: string[]) => void
  onComplete: () => void
  onDismiss: () => void
  onNavigateToPlan: () => void
  metadataMap: Record<string, TaskMetadata>
  onSetMetadata: (taskId: string, partial: Partial<TaskMetadata>) => void
}

function flattenTasks(tasks: Task[]): Task[] {
  const flat: Task[] = []
  for (const t of tasks) {
    flat.push(t)
    if (t.children) flat.push(...flattenTasks(t.children))
  }
  return flat
}

const STEP_LABELS = [
  'Review Yesterday',
  'Pick Your MITs',
  'Set Energy Levels',
  'Preview Calendar',
  'AI Plan (Optional)',
  'Ready to Go!'
]

const ENERGY_OPTIONS: { value: EnergyLevel; label: string; color: string }[] = [
  { value: 'high', label: 'High', color: 'var(--danger)' },
  { value: 'medium', label: 'Medium', color: 'var(--warning)' },
  { value: 'low', label: 'Low', color: 'var(--success)' }
]

export function DailyRitual({
  signedIn,
  taskLists,
  mits,
  onSetMITs,
  onComplete,
  onDismiss,
  onNavigateToPlan,
  metadataMap,
  onSetMetadata
}: DailyRitualProps) {
  const [step, setStep] = useState(0)
  const [droppedIds, setDroppedIds] = useState<Set<string>>(new Set())
  const [events, setEvents] = useState<any[]>([])
  const [focusStats, setFocusStats] = useState<{ todayMinutes: number; streak: number } | null>(null)
  const [allTasksFromAllLists, setAllTasksFromAllLists] = useState<Task[]>([])
  const [taskListMap, setTaskListMap] = useState<Record<string, string>>({})
  const [energyPickerTaskId, setEnergyPickerTaskId] = useState<string | null>(null)
  const [ritualListId, setRitualListId] = useState<string>('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const all: Task[] = []
      const listMap: Record<string, string> = {}
      for (const list of taskLists) {
        const res = await window.api.getTasks(list.id)
        if (cancelled) return
        if (res.success && res.data) {
          all.push(...res.data)
          for (const t of flattenTasks(res.data)) {
            listMap[t.id] = list.id
          }
        }
      }
      setAllTasksFromAllLists(all)
      setTaskListMap(listMap)
    })()
    return () => { cancelled = true }
  }, [taskLists])

  const flat = useMemo(() => flattenTasks(allTasksFromAllLists), [allTasksFromAllLists])

  // Yesterday's incomplete tasks
  const yesterday = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    return d.toISOString().split('T')[0]
  }, [])

  const yesterdayIncomplete = useMemo(() => {
    return flat.filter((t) => {
      if (t.status === 'completed') return false
      if (!t.due) return false
      return t.due.split('T')[0] <= yesterday
    })
  }, [flat, yesterday])

  useEffect(() => {
    // Load today's calendar events
    window.api.getPlannerSettings().then(async (result) => {
      if (result?.data?.defaultCalendarId) {
        const today = new Date()
        const timeMin = new Date(today.setHours(0, 0, 0, 0)).toISOString()
        const timeMax = new Date(today.setHours(23, 59, 59, 999)).toISOString()
        const evResult = await window.api.getCalendarEvents(result.data.defaultCalendarId, timeMin, timeMax)
        if (evResult?.data) setEvents(evResult.data)
      }
    })

    // Load focus stats
    window.api.getFocusStats().then((result) => {
      if (result?.data) setFocusStats(result.data)
    })
  }, [])

  const handleDrop = (taskId: string) => {
    setDroppedIds((prev) => new Set([...prev, taskId]))
  }

  const handleKeep = (taskId: string) => {
    setDroppedIds((prev) => {
      const next = new Set(prev)
      next.delete(taskId)
      return next
    })
  }

  const handleFinish = () => {
    onComplete()
  }

  const handlePlanDay = () => {
    onComplete()
    onNavigateToPlan()
  }

  const canNext = step < STEP_LABELS.length - 1
  const canPrev = step > 0
  const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
  const incompleteTasks = flat.filter((t) => t.status !== 'completed')
  const filteredIncomplete = ritualListId
    ? incompleteTasks.filter((t) => taskListMap[t.id] === ritualListId)
    : incompleteTasks
  const completedToday = flat.filter((t) => t.status === 'completed' && t.completed?.startsWith(new Date().toISOString().split('T')[0]))

  return (
    <div className="focus-overlay ritual-overlay">
      <button className="focus-exit-btn" onClick={onDismiss} title="Skip ritual">
        <X size={18} />
      </button>

      <div className="ritual-content">
        <div className="ritual-header">
          <span className="ritual-date">{todayStr}</span>
          <h2 className="ritual-title">Morning Ritual</h2>
          <div className="ritual-progress">
            {STEP_LABELS.map((_, i) => (
              <div key={i} className={`ritual-progress-dot ${i <= step ? 'active' : ''} ${i === step ? 'current' : ''}`} />
            ))}
          </div>
          <span className="ritual-step-label">{STEP_LABELS[step]}</span>
        </div>

        <div className="ritual-body">
          {/* Step 0: Review yesterday's unfinished */}
          {step === 0 && (
            <div className="ritual-step">
              {yesterdayIncomplete.length === 0 ? (
                <div className="ritual-empty">All caught up! No tasks from yesterday.</div>
              ) : (
                <div className="ritual-task-list">
                  {yesterdayIncomplete.map((t) => (
                    <div key={t.id} className={`ritual-task-item ${droppedIds.has(t.id) ? 'dropped' : ''}`}>
                      <span className="ritual-task-title">{t.title}</span>
                      <div className="ritual-task-actions">
                        {droppedIds.has(t.id) ? (
                          <button className="ritual-keep-btn" onClick={() => handleKeep(t.id)}>Keep</button>
                        ) : (
                          <button className="ritual-drop-btn" onClick={() => handleDrop(t.id)}>
                            <Trash2 size={12} />
                            Drop
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 1: Pick MITs */}
          {step === 1 && (
            <div className="ritual-step">
              <MITSection
                mits={mits}
                taskLists={taskLists}
                onSetMITs={onSetMITs}
              />
            </div>
          )}

          {/* Step 2: Set energy levels */}
          {step === 2 && (
            <div className="ritual-step">
              <div className="ritual-energy-info">
                Tap a task to set its energy level.
              </div>
              <div className="timer-task-picker">
                <ChevronDown size={12} />
                <select
                  value={ritualListId}
                  onChange={(e) => setRitualListId(e.target.value)}
                >
                  <option value="">All lists</option>
                  {taskLists.map((l) => (
                    <option key={l.id} value={l.id}>{l.title}</option>
                  ))}
                </select>
              </div>
              <div className="ritual-task-list">
                {filteredIncomplete.map((t) => (
                  <div
                    key={t.id}
                    className="ritual-task-item clickable"
                    onClick={() => setEnergyPickerTaskId(energyPickerTaskId === t.id ? null : t.id)}
                  >
                    <span className="ritual-task-title">{t.title}</span>
                    {metadataMap[t.id]?.energyLevel ? (
                      <span
                        className="ritual-energy-dot"
                        style={{ background: ENERGY_OPTIONS.find((e) => e.value === metadataMap[t.id].energyLevel)?.color }}
                        title={metadataMap[t.id].energyLevel}
                      >
                        <Zap size={10} />
                        {metadataMap[t.id].energyLevel}
                      </span>
                    ) : (
                      <span className="ritual-energy-dot ritual-energy-unset">
                        <Zap size={10} />
                      </span>
                    )}
                    {energyPickerTaskId === t.id && (
                      <div className="ritual-energy-picker" onClick={(e) => e.stopPropagation()}>
                        {ENERGY_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            className={`ritual-energy-option ${metadataMap[t.id]?.energyLevel === opt.value ? 'active' : ''}`}
                            style={{ '--energy-color': opt.color } as React.CSSProperties}
                            onClick={() => {
                              const newVal = metadataMap[t.id]?.energyLevel === opt.value ? undefined : opt.value
                              onSetMetadata(t.id, { energyLevel: newVal })
                              setEnergyPickerTaskId(null)
                            }}
                          >
                            <Zap size={10} />
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Calendar preview */}
          {step === 3 && (
            <div className="ritual-step">
              {events.length === 0 ? (
                <div className="ritual-empty">No events scheduled today.</div>
              ) : (
                <div className="ritual-task-list">
                  {events.map((ev: any) => (
                    <div key={ev.id} className="ritual-event-item">
                      <Calendar size={12} />
                      <span className="ritual-event-time">
                        {ev.start?.includes('T')
                          ? new Date(ev.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
                          : 'All day'}
                      </span>
                      <span className="ritual-event-title">{ev.summary}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 4: AI plan */}
          {step === 4 && (
            <div className="ritual-step">
              <div className="ritual-plan-prompt">
                <Sparkles size={24} className="ritual-plan-icon" />
                <p>Generate an AI-powered schedule for today?</p>
                <button className="plan-generate-btn" onClick={handlePlanDay}>
                  <Sparkles size={14} />
                  Plan My Day
                </button>
                <button className="ritual-skip-plan" onClick={() => setStep(5)}>
                  Skip this step
                </button>
              </div>
            </div>
          )}

          {/* Step 5: Summary */}
          {step === 5 && (
            <div className="ritual-step">
              <div className="ritual-summary">
                <Trophy size={28} className="ritual-trophy" />
                <div className="ritual-summary-stats">
                  <div className="eod-stat">
                    <span className="eod-stat-value">{incompleteTasks.length}</span>
                    <span className="eod-stat-label">tasks today</span>
                  </div>
                  <div className="eod-stat">
                    <span className="eod-stat-value">{mits.length}</span>
                    <span className="eod-stat-label">MITs set</span>
                  </div>
                  <div className="eod-stat">
                    <span className="eod-stat-value">{events.length}</span>
                    <span className="eod-stat-label">events</span>
                  </div>
                  {focusStats?.streak ? (
                    <div className="eod-stat">
                      <span className="eod-stat-value">{focusStats.streak}</span>
                      <span className="eod-stat-label">day streak</span>
                    </div>
                  ) : null}
                </div>
                <p className="ritual-motivation">You've got this! Start with your frog.</p>
                <button className="plan-generate-btn" onClick={handleFinish}>
                  Let's Go!
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="ritual-nav">
          {canPrev ? (
            <button className="ritual-nav-btn" onClick={() => setStep(step - 1)}>
              <ChevronLeft size={16} />
              Back
            </button>
          ) : <div />}
          {canNext && (
            <button className="ritual-nav-btn ritual-nav-next" onClick={() => setStep(step + 1)}>
              Next
              <ChevronRight size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
