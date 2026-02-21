import { useState, useEffect, useCallback, useRef } from 'react'
import { Play, Pause, SkipForward, Square, Flame, ChevronDown, Minimize2, Maximize2 } from 'lucide-react'
import { Task, PomodoroConfig, FocusStats } from '../types'
import { usePomodoroTimer, PomodoroPhase } from '../hooks/usePomodoroTimer'

interface TimerViewProps {
  allTasks: Task[]
  mini?: boolean
  onToggleMini?: () => void
}

const CIRCLE_RADIUS = 90
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function phaseLabel(phase: PomodoroPhase): string {
  switch (phase) {
    case 'work': return 'Focus'
    case 'break': return 'Break'
    case 'longBreak': return 'Long Break'
    default: return 'Ready'
  }
}

function phaseColor(phase: PomodoroPhase): string {
  switch (phase) {
    case 'work': return 'var(--accent)'
    case 'break': return 'var(--success)'
    case 'longBreak': return 'var(--warning)'
    default: return 'var(--text-tertiary)'
  }
}

function flattenTasks(tasks: Task[]): Task[] {
  const flat: Task[] = []
  for (const t of tasks) {
    if (t.status === 'needsAction') flat.push(t)
    if (t.children) flat.push(...flattenTasks(t.children))
  }
  return flat
}

export function TimerView({ allTasks, mini, onToggleMini }: TimerViewProps) {
  const [config, setConfig] = useState<PomodoroConfig | null>(null)
  const [stats, setStats] = useState<FocusStats | null>(null)
  const [selectedTaskId, setSelectedTaskId] = useState<string>('')
  const [totalMinutes, setTotalMinutes] = useState(0)
  const [started, setStarted] = useState(false)
  const workStartRef = useRef<string>('')
  const totalMinutesRef = useRef(0)

  const incompleteTasks = flattenTasks(allTasks)

  const selectedTask = incompleteTasks.find((t) => t.id === selectedTaskId)

  const handleWorkComplete = useCallback(async () => {
    if (!config) return

    const endTime = new Date().toISOString()
    const startTime = workStartRef.current

    const session = {
      id: `focus-${Date.now()}`,
      taskId: selectedTaskId || 'free-focus',
      taskTitle: selectedTask?.title || 'Free Focus',
      startTime,
      endTime,
      durationMinutes: config.workMinutes,
      completed: true
    }

    await window.api.logFocusSession(session)
    await window.api.notify('Focus Complete', 'Time for a break!')

    if (config.logToCalendar && selectedTask) {
      try {
        const plannerSettings = await window.api.getPlannerSettings()
        if (plannerSettings?.data?.defaultCalendarId) {
          await window.api.createCalendarEvent(plannerSettings.data.defaultCalendarId, {
            summary: `Focus: ${selectedTask.title}`,
            start: startTime,
            end: endTime,
            description: `Pomodoro focus session (${config.workMinutes} min)`
          })
        }
      } catch {
        // best effort
      }
    }

    totalMinutesRef.current += config.workMinutes
    setTotalMinutes(totalMinutesRef.current)

    const freshStats = await window.api.getFocusStats()
    if (freshStats?.data) setStats(freshStats.data)
  }, [config, selectedTaskId, selectedTask])

  const timer = usePomodoroTimer(handleWorkComplete)

  useEffect(() => {
    if (timer.phase === 'work' && timer.isRunning) {
      workStartRef.current = new Date().toISOString()
    }
  }, [timer.phase, timer.isRunning])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [settingsResult, statsResult] = await Promise.all([
        window.api.getPomodoroSettings(),
        window.api.getFocusStats()
      ])
      if (cancelled) return

      const pomodoroConfig: PomodoroConfig = settingsResult?.data ?? {
        workMinutes: 25, breakMinutes: 5, longBreakMinutes: 15,
        sessionsBeforeLongBreak: 4, logToCalendar: false
      }
      setConfig(pomodoroConfig)
      if (statsResult?.data) setStats(statsResult.data)
    })()
    return () => { cancelled = true }
  }, [])

  const handleStart = () => {
    if (!config) return
    timer.start(config)
    setStarted(true)
  }

  const handleStop = () => {
    timer.reset()
    setStarted(false)
    totalMinutesRef.current = 0
    setTotalMinutes(0)
  }

  const progress =
    timer.totalSeconds > 0
      ? (timer.totalSeconds - timer.secondsRemaining) / timer.totalSeconds
      : 0
  const strokeOffset = CIRCLE_CIRCUMFERENCE * (1 - progress)
  const color = phaseColor(timer.phase)
  const streak = stats?.streak ?? 0

  if (mini) {
    return (
      <div className="timer-mini">
        <div className="timer-mini-drag" />
        <div className="timer-mini-ring">
          <svg viewBox="0 0 200 200" width="120" height="120">
            <circle cx="100" cy="100" r={CIRCLE_RADIUS} fill="none" stroke="var(--border)" strokeWidth="8" />
            {started && (
              <circle
                cx="100" cy="100" r={CIRCLE_RADIUS} fill="none"
                stroke={color} strokeWidth="8" strokeLinecap="round"
                strokeDasharray={CIRCLE_CIRCUMFERENCE} strokeDashoffset={strokeOffset}
                transform="rotate(-90 100 100)"
                style={{ transition: 'stroke-dashoffset 0.15s linear, stroke 0.3s ease' }}
              />
            )}
          </svg>
          <div className="timer-mini-center">
            <span className="timer-mini-phase" style={{ color }}>
              {phaseLabel(timer.phase)}
            </span>
            <span className="timer-mini-time">
              {started ? formatTime(timer.secondsRemaining) : formatTime((config?.workMinutes ?? 25) * 60)}
            </span>
          </div>
        </div>
        <div className="timer-mini-controls">
          {!started ? (
            <button className="timer-mini-btn timer-mini-btn-primary" onClick={handleStart} disabled={!config} title="Start">
              <Play size={16} />
            </button>
          ) : (
            <>
              {timer.isPaused ? (
                <button className="timer-mini-btn timer-mini-btn-primary" onClick={timer.resume} title="Resume">
                  <Play size={16} />
                </button>
              ) : (
                <button className="timer-mini-btn timer-mini-btn-primary" onClick={timer.pause} title="Pause">
                  <Pause size={16} />
                </button>
              )}
              <button className="timer-mini-btn timer-mini-btn-danger" onClick={handleStop} title="Stop">
                <Square size={14} />
              </button>
            </>
          )}
          <button className="timer-mini-btn" onClick={onToggleMini} title="Expand">
            <Maximize2 size={14} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="timer-view">
      <div className="timer-view-content">
        {streak > 0 && (
          <div className="focus-streak-badge">
            <Flame size={14} />
            <span>{streak} day streak</span>
          </div>
        )}

        {/* Mini toggle */}
        {onToggleMini && (
          <button className="timer-mini-toggle" onClick={onToggleMini} title="Mini timer">
            <Minimize2 size={14} />
          </button>
        )}

        {/* Task picker */}
        <div className="timer-task-picker">
          <ChevronDown size={12} />
          <select
            value={selectedTaskId}
            onChange={(e) => setSelectedTaskId(e.target.value)}
            disabled={started}
          >
            <option value="">No task — just focus</option>
            {incompleteTasks.map((t) => (
              <option key={t.id} value={t.id}>{t.title}</option>
            ))}
          </select>
        </div>

        {/* Timer ring */}
        <div className="focus-timer-ring timer-ring-compact">
          <svg viewBox="0 0 200 200" width="150" height="150">
            <circle cx="100" cy="100" r={CIRCLE_RADIUS} fill="none" stroke="var(--border)" strokeWidth="6" />
            {started && (
              <circle
                cx="100" cy="100" r={CIRCLE_RADIUS} fill="none"
                stroke={color} strokeWidth="6" strokeLinecap="round"
                strokeDasharray={CIRCLE_CIRCUMFERENCE} strokeDashoffset={strokeOffset}
                transform="rotate(-90 100 100)"
                style={{ transition: 'stroke-dashoffset 0.15s linear, stroke 0.3s ease' }}
              />
            )}
          </svg>
          <div className="focus-timer-center">
            <span className="focus-phase-label" style={{ color }}>
              {phaseLabel(timer.phase)}
            </span>
            <span className="focus-time-display">
              {started ? formatTime(timer.secondsRemaining) : formatTime((config?.workMinutes ?? 25) * 60)}
            </span>
            {started && config && (
              <span className="focus-session-counter">
                Session {timer.sessionCount + (timer.phase === 'work' ? 1 : 0)}
                {config.sessionsBeforeLongBreak > 0 && ` / ${config.sessionsBeforeLongBreak}`}
              </span>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="focus-controls">
          {!started ? (
            <button
              className="focus-ctrl-btn focus-ctrl-primary"
              onClick={handleStart}
              disabled={!config}
              title="Start"
            >
              <Play size={20} />
            </button>
          ) : (
            <>
              {timer.isPaused ? (
                <button className="focus-ctrl-btn focus-ctrl-primary" onClick={timer.resume} title="Resume">
                  <Play size={20} />
                </button>
              ) : (
                <button className="focus-ctrl-btn focus-ctrl-primary" onClick={timer.pause} title="Pause">
                  <Pause size={20} />
                </button>
              )}
              <button className="focus-ctrl-btn" onClick={timer.skip} title="Skip phase">
                <SkipForward size={18} />
              </button>
              <button className="focus-ctrl-btn focus-ctrl-danger" onClick={handleStop} title="Stop">
                <Square size={18} />
              </button>
            </>
          )}
        </div>

        {/* Stats */}
        <div className="timer-stats">
          <div className="timer-stat">
            <span className="timer-stat-value">{stats?.todaySessions ?? 0}</span>
            <span className="timer-stat-label">Sessions</span>
          </div>
          <div className="timer-stat">
            <span className="timer-stat-value">{stats?.todayMinutes ?? 0}</span>
            <span className="timer-stat-label">Minutes</span>
          </div>
          <div className="timer-stat">
            <span className="timer-stat-value">{streak}</span>
            <span className="timer-stat-label">Streak</span>
          </div>
        </div>

        {totalMinutes > 0 && (
          <div className="focus-stats-row">
            <span>{timer.sessionCount} session{timer.sessionCount !== 1 ? 's' : ''}</span>
            <span className="focus-stats-dot">&middot;</span>
            <span>{totalMinutes} min this run</span>
          </div>
        )}
      </div>
    </div>
  )
}
