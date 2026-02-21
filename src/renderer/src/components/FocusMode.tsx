import { useState, useEffect, useCallback, useRef } from 'react'
import { X, Play, Pause, SkipForward, Square, Flame } from 'lucide-react'
import { Task, PomodoroConfig, FocusStats } from '../types'
import { usePomodoroTimer, PomodoroPhase } from '../hooks/usePomodoroTimer'

interface FocusModeProps {
  task: Task
  onExit: (summary: { totalMinutes: number; sessionsCompleted: number }) => void
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
    case 'work':
      return 'Focus'
    case 'break':
      return 'Break'
    case 'longBreak':
      return 'Long Break'
    default:
      return ''
  }
}

function phaseColor(phase: PomodoroPhase): string {
  switch (phase) {
    case 'work':
      return 'var(--accent)'
    case 'break':
      return 'var(--success)'
    case 'longBreak':
      return 'var(--warning)'
    default:
      return 'var(--accent)'
  }
}

export function FocusMode({ task, onExit }: FocusModeProps) {
  const [config, setConfig] = useState<PomodoroConfig | null>(null)
  const [stats, setStats] = useState<FocusStats | null>(null)
  const [totalMinutes, setTotalMinutes] = useState(0)
  const workStartRef = useRef<string>('')
  const totalMinutesRef = useRef(0)
  const sessionCountRef = useRef(0)

  const handleWorkComplete = useCallback(async () => {
    if (!config) return

    const endTime = new Date().toISOString()
    const startTime = workStartRef.current

    // Log the focus session
    const session = {
      id: `focus-${Date.now()}`,
      taskId: task.id,
      taskTitle: task.title,
      startTime,
      endTime,
      durationMinutes: config.workMinutes,
      completed: true
    }

    await window.api.logFocusSession(session)
    await window.api.notify('Focus Complete', 'Time for a break!')

    // Log to calendar if enabled
    if (config.logToCalendar) {
      try {
        const plannerSettings = await window.api.getPlannerSettings()
        if (plannerSettings?.data?.defaultCalendarId) {
          await window.api.createCalendarEvent(plannerSettings.data.defaultCalendarId, {
            summary: `Focus: ${task.title}`,
            start: startTime,
            end: endTime,
            description: `Pomodoro focus session (${config.workMinutes} min)`
          })
        }
      } catch {
        // Calendar logging is best-effort
      }
    }

    // Update cumulative minutes
    totalMinutesRef.current += config.workMinutes
    setTotalMinutes(totalMinutesRef.current)

    // Refresh stats to get updated streak
    const freshStats = await window.api.getFocusStats()
    if (freshStats?.data) {
      setStats(freshStats.data)
    }
  }, [config, task.id, task.title])

  const timer = usePomodoroTimer(handleWorkComplete)

  // Track sessionCount changes to keep ref in sync
  useEffect(() => {
    sessionCountRef.current = timer.sessionCount
  }, [timer.sessionCount])

  // Record the start of each work phase
  useEffect(() => {
    if (timer.phase === 'work' && timer.isRunning) {
      workStartRef.current = new Date().toISOString()
    }
  }, [timer.phase, timer.isRunning])

  // Fetch settings and stats on mount, then start timer
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [settingsResult, statsResult] = await Promise.all([
        window.api.getPomodoroSettings(),
        window.api.getFocusStats()
      ])

      if (cancelled) return

      const pomodoroConfig: PomodoroConfig = settingsResult?.data ?? {
        workMinutes: 25,
        breakMinutes: 5,
        longBreakMinutes: 15,
        sessionsBeforeLongBreak: 4,
        logToCalendar: false
      }
      setConfig(pomodoroConfig)

      if (statsResult?.data) {
        setStats(statsResult.data)
      }

      timer.start(pomodoroConfig)
    })()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleExit = useCallback(() => {
    timer.reset()
    onExit({
      totalMinutes: totalMinutesRef.current,
      sessionsCompleted: sessionCountRef.current
    })
  }, [timer, onExit])

  // Progress calculation for SVG ring
  const progress =
    timer.totalSeconds > 0
      ? (timer.totalSeconds - timer.secondsRemaining) / timer.totalSeconds
      : 0
  const strokeOffset = CIRCLE_CIRCUMFERENCE * (1 - progress)
  const color = phaseColor(timer.phase)
  const streak = stats?.streak ?? 0

  if (!config) {
    return (
      <div className="focus-overlay">
        <div className="focus-loading">
          <div className="spinner" />
        </div>
      </div>
    )
  }

  return (
    <div className="focus-overlay">
      {/* Exit button */}
      <button className="focus-exit-btn" onClick={handleExit} title="Exit focus mode">
        <X size={18} />
      </button>

      <div className="focus-content">
        {/* Streak badge */}
        {streak > 0 && (
          <div className="focus-streak-badge">
            <Flame size={14} />
            <span>{streak}</span>
          </div>
        )}

        {/* Task title */}
        <div className="focus-task-title">{task.title}</div>

        {/* Circular timer */}
        <div className="focus-timer-ring">
          <svg viewBox="0 0 200 200" width="180" height="180">
            {/* Background track */}
            <circle
              cx="100"
              cy="100"
              r={CIRCLE_RADIUS}
              fill="none"
              stroke="var(--border)"
              strokeWidth="6"
            />
            {/* Progress ring */}
            <circle
              cx="100"
              cy="100"
              r={CIRCLE_RADIUS}
              fill="none"
              stroke={color}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={CIRCLE_CIRCUMFERENCE}
              strokeDashoffset={strokeOffset}
              transform="rotate(-90 100 100)"
              style={{ transition: 'stroke-dashoffset 0.15s linear, stroke 0.3s ease' }}
            />
          </svg>

          {/* Centered text inside the ring */}
          <div className="focus-timer-center">
            <span className="focus-phase-label" style={{ color }}>
              {phaseLabel(timer.phase)}
            </span>
            <span className="focus-time-display">{formatTime(timer.secondsRemaining)}</span>
            <span className="focus-session-counter">
              Session {timer.sessionCount + (timer.phase === 'work' ? 1 : 0)}
              {config.sessionsBeforeLongBreak > 0 && ` / ${config.sessionsBeforeLongBreak}`}
            </span>
          </div>
        </div>

        {/* Control buttons */}
        <div className="focus-controls">
          {/* Play / Pause */}
          {timer.isPaused ? (
            <button
              className="focus-ctrl-btn focus-ctrl-primary"
              onClick={timer.resume}
              title="Resume"
            >
              <Play size={20} />
            </button>
          ) : (
            <button
              className="focus-ctrl-btn focus-ctrl-primary"
              onClick={timer.pause}
              title="Pause"
            >
              <Pause size={20} />
            </button>
          )}

          {/* Skip */}
          <button className="focus-ctrl-btn" onClick={timer.skip} title="Skip phase">
            <SkipForward size={18} />
          </button>

          {/* Stop */}
          <button className="focus-ctrl-btn focus-ctrl-danger" onClick={handleExit} title="Stop">
            <Square size={18} />
          </button>
        </div>

        {/* Session stats */}
        {totalMinutes > 0 && (
          <div className="focus-stats-row">
            <span>{timer.sessionCount} session{timer.sessionCount !== 1 ? 's' : ''}</span>
            <span className="focus-stats-dot">&middot;</span>
            <span>{totalMinutes} min focused</span>
          </div>
        )}
      </div>
    </div>
  )
}
