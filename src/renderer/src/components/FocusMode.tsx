import { useState, useEffect, useCallback, useRef } from 'react'
import { X, Play, Pause, SkipForward, Square, Flame, CheckCircle2, ArrowRight } from 'lucide-react'
import { Task, PomodoroConfig, FocusStats } from '../types'
import { usePomodoroTimer, PomodoroPhase } from '../hooks/usePomodoroTimer'

interface FocusModeProps {
  task: Task
  onExit: (summary: { totalMinutes: number; sessionsCompleted: number }) => void
  onToggleComplete?: (taskId: string, completed: boolean) => void
  mode?: 'pomodoro' | 'timebox'
  timeBoxMinutes?: number
}

const CIRCLE_RADIUS = 90
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function phaseLabel(phase: PomodoroPhase, isTimebox: boolean): string {
  if (isTimebox) return 'Time Box'
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

function phaseColor(phase: PomodoroPhase, isTimebox: boolean): string {
  if (isTimebox) return 'var(--warning)'
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

export function FocusMode({ task, onExit, onToggleComplete, mode = 'pomodoro', timeBoxMinutes }: FocusModeProps) {
  const isTimebox = mode === 'timebox' && !!timeBoxMinutes
  const [config, setConfig] = useState<PomodoroConfig | null>(null)
  const [stats, setStats] = useState<FocusStats | null>(null)
  const [totalMinutes, setTotalMinutes] = useState(0)
  const [timeboxDone, setTimeboxDone] = useState(false)
  const [showCompletionPrompt, setShowCompletionPrompt] = useState(false)
  const workStartRef = useRef<string>('')
  const totalMinutesRef = useRef(0)
  const sessionCountRef = useRef(0)

  const handleWorkComplete = useCallback(async () => {
    const endTime = new Date().toISOString()
    const startTime = workStartRef.current
    const duration = isTimebox ? timeBoxMinutes! : (config?.workMinutes ?? 25)

    const session = {
      id: `focus-${Date.now()}`,
      taskId: task.id,
      taskTitle: task.title,
      startTime,
      endTime,
      durationMinutes: duration,
      completed: true
    }

    await window.api.logFocusSession(session)

    if (isTimebox) {
      await window.api.notify("TIME'S UP", `Time box for "${task.title}" is complete!`)
      setTimeboxDone(true)
      setShowCompletionPrompt(true)
      totalMinutesRef.current += duration
      setTotalMinutes(totalMinutesRef.current)
      return
    }

    setShowCompletionPrompt(true)
    await window.api.notify('Focus Complete', 'Time for a break!')

    if (config?.logToCalendar) {
      try {
        const plannerSettings = await window.api.getPlannerSettings()
        if (plannerSettings?.data?.defaultCalendarId) {
          await window.api.createCalendarEvent(plannerSettings.data.defaultCalendarId, {
            summary: `Focus: ${task.title}`,
            start: startTime,
            end: endTime,
            description: `Pomodoro focus session (${duration} min)`
          })
        }
      } catch {
        // Calendar logging is best-effort
      }
    }

    totalMinutesRef.current += duration
    setTotalMinutes(totalMinutesRef.current)

    const freshStats = await window.api.getFocusStats()
    if (freshStats?.data) {
      setStats(freshStats.data)
    }
  }, [config, task.id, task.title, isTimebox, timeBoxMinutes])

  const timer = usePomodoroTimer(handleWorkComplete)

  useEffect(() => {
    sessionCountRef.current = timer.sessionCount
  }, [timer.sessionCount])

  useEffect(() => {
    if (timer.phase === 'work' && timer.isRunning) {
      workStartRef.current = new Date().toISOString()
    }
    // Report break start to nudge engine
    if ((timer.phase === 'break' || timer.phase === 'longBreak') && timer.isRunning) {
      window.api.reportBreakStart?.()
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

      if (statsResult?.data) {
        setStats(statsResult.data)
      }

      if (isTimebox) {
        // Create synthetic config for timebox mode: single work session, no breaks
        const timeboxConfig: PomodoroConfig = {
          workMinutes: timeBoxMinutes!,
          breakMinutes: 0,
          longBreakMinutes: 0,
          sessionsBeforeLongBreak: 999,
          logToCalendar: settingsResult?.data?.logToCalendar ?? false
        }
        setConfig(timeboxConfig)
        timer.start(timeboxConfig)
      } else {
        const pomodoroConfig: PomodoroConfig = settingsResult?.data ?? {
          workMinutes: 25,
          breakMinutes: 5,
          longBreakMinutes: 15,
          sessionsBeforeLongBreak: 4,
          logToCalendar: false
        }
        setConfig(pomodoroConfig)
        timer.start(pomodoroConfig)
      }
    })()

    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleMarkComplete = useCallback(() => {
    onToggleComplete?.(task.id, true)
    setShowCompletionPrompt(false)
    timer.reset()
    onExit({
      totalMinutes: totalMinutesRef.current,
      sessionsCompleted: sessionCountRef.current
    })
  }, [onToggleComplete, task.id, timer, onExit])

  const handleDismissPrompt = useCallback(() => {
    setShowCompletionPrompt(false)
  }, [])

  const handleExit = useCallback(() => {
    timer.reset()
    onExit({
      totalMinutes: totalMinutesRef.current,
      sessionsCompleted: sessionCountRef.current
    })
  }, [timer, onExit])

  const progress =
    timer.totalSeconds > 0
      ? (timer.totalSeconds - timer.secondsRemaining) / timer.totalSeconds
      : 0
  const strokeOffset = CIRCLE_CIRCUMFERENCE * (1 - progress)
  const color = phaseColor(timer.phase, isTimebox)
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
    <div className={`focus-overlay ${isTimebox ? 'focus-timebox' : ''}`}>
      <button className="focus-exit-btn" onClick={handleExit} title="Exit focus mode">
        <X size={18} />
      </button>

      <div className="focus-content">
        {streak > 0 && (
          <div className="focus-streak-badge">
            <Flame size={14} />
            <span>{streak}</span>
          </div>
        )}

        <div className="focus-task-title">{task.title}</div>

        {timeboxDone ? (
          <div className="focus-timebox-done">
            <div className="focus-timebox-done-text">TIME'S UP!</div>
            <div className="focus-timebox-done-sub">{timeBoxMinutes} minutes completed</div>
            {showCompletionPrompt && onToggleComplete ? (
              <div className="focus-completion-prompt">
                <span className="focus-completion-label">Did you finish this task?</span>
                <div className="focus-completion-actions">
                  <button className="focus-completion-btn focus-completion-yes" onClick={handleMarkComplete}>
                    <CheckCircle2 size={14} />
                    Yes, done
                  </button>
                  <button className="focus-completion-btn focus-completion-no" onClick={() => { handleDismissPrompt(); handleExit() }}>
                    <ArrowRight size={14} />
                    Not yet
                  </button>
                </div>
              </div>
            ) : (
              <button className="focus-ctrl-btn focus-ctrl-primary" onClick={handleExit}>
                Done
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="focus-timer-ring">
              <svg viewBox="0 0 200 200" width="180" height="180">
                <circle cx="100" cy="100" r={CIRCLE_RADIUS} fill="none" stroke="var(--border)" strokeWidth="6" />
                <circle
                  cx="100" cy="100" r={CIRCLE_RADIUS} fill="none"
                  stroke={color} strokeWidth="6" strokeLinecap="round"
                  strokeDasharray={CIRCLE_CIRCUMFERENCE} strokeDashoffset={strokeOffset}
                  transform="rotate(-90 100 100)"
                  style={{ transition: 'stroke-dashoffset 0.15s linear, stroke 0.3s ease' }}
                />
              </svg>
              <div className="focus-timer-center">
                <span className="focus-phase-label" style={{ color }}>
                  {phaseLabel(timer.phase, isTimebox)}
                </span>
                <span className="focus-time-display">{formatTime(timer.secondsRemaining)}</span>
                {!isTimebox && (
                  <span className="focus-session-counter">
                    Session {timer.sessionCount + (timer.phase === 'work' ? 1 : 0)}
                    {config.sessionsBeforeLongBreak > 0 && config.sessionsBeforeLongBreak < 999 && ` / ${config.sessionsBeforeLongBreak}`}
                  </span>
                )}
              </div>
            </div>

            {showCompletionPrompt && onToggleComplete && (
              <div className="focus-completion-prompt">
                <span className="focus-completion-label">Did you finish this task?</span>
                <div className="focus-completion-actions">
                  <button className="focus-completion-btn focus-completion-yes" onClick={handleMarkComplete}>
                    <CheckCircle2 size={14} />
                    Yes, done
                  </button>
                  <button className="focus-completion-btn focus-completion-no" onClick={handleDismissPrompt}>
                    <ArrowRight size={14} />
                    Not yet
                  </button>
                </div>
              </div>
            )}

            <div className="focus-controls">
              {timer.isPaused ? (
                <button className="focus-ctrl-btn focus-ctrl-primary" onClick={timer.resume} title="Resume">
                  <Play size={20} />
                </button>
              ) : (
                <button className="focus-ctrl-btn focus-ctrl-primary" onClick={timer.pause} title="Pause">
                  <Pause size={20} />
                </button>
              )}
              {!isTimebox && (
                <button className="focus-ctrl-btn" onClick={timer.skip} title="Skip phase">
                  <SkipForward size={18} />
                </button>
              )}
              <button className="focus-ctrl-btn focus-ctrl-danger" onClick={handleExit} title="Stop">
                <Square size={18} />
              </button>
            </div>

            {totalMinutes > 0 && (
              <div className="focus-stats-row">
                <span>{timer.sessionCount} session{timer.sessionCount !== 1 ? 's' : ''}</span>
                <span className="focus-stats-dot">&middot;</span>
                <span>{totalMinutes} min focused</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
