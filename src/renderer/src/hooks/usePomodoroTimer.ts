import { useState, useEffect, useRef, useCallback } from 'react'
import { PomodoroConfig } from '../types'

export type PomodoroPhase = 'idle' | 'work' | 'break' | 'longBreak'

export interface PomodoroTimerState {
  phase: PomodoroPhase
  secondsRemaining: number
  totalSeconds: number
  sessionCount: number
  isRunning: boolean
  isPaused: boolean
  start: (config: PomodoroConfig) => void
  pause: () => void
  resume: () => void
  skip: () => void
  reset: () => void
}

export function usePomodoroTimer(
  onWorkComplete?: () => void
): PomodoroTimerState {
  const [phase, setPhase] = useState<PomodoroPhase>('idle')
  const [secondsRemaining, setSecondsRemaining] = useState(0)
  const [totalSeconds, setTotalSeconds] = useState(0)
  const [sessionCount, setSessionCount] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)

  // Refs for drift-proof timing
  const startedAtRef = useRef<number>(0)
  const durationMsRef = useRef<number>(0)
  const pausedElapsedRef = useRef<number>(0)
  const configRef = useRef<PomodoroConfig | null>(null)
  const sessionCountRef = useRef(0)
  const onWorkCompleteRef = useRef(onWorkComplete)

  // Keep the callback ref up-to-date
  onWorkCompleteRef.current = onWorkComplete

  const setPhaseTimer = useCallback((newPhase: PomodoroPhase, minutes: number) => {
    const secs = minutes * 60
    setPhase(newPhase)
    setTotalSeconds(secs)
    setSecondsRemaining(secs)
    durationMsRef.current = secs * 1000
    pausedElapsedRef.current = 0
    startedAtRef.current = Date.now()
    setIsRunning(true)
    setIsPaused(false)
  }, [])

  const transitionToNextPhase = useCallback(() => {
    const config = configRef.current
    if (!config) return

    if (phase === 'work') {
      // A work session just completed
      const newCount = sessionCountRef.current + 1
      sessionCountRef.current = newCount
      setSessionCount(newCount)
      onWorkCompleteRef.current?.()

      // Decide break type
      if (newCount % config.sessionsBeforeLongBreak === 0) {
        setPhaseTimer('longBreak', config.longBreakMinutes)
      } else {
        setPhaseTimer('break', config.breakMinutes)
      }
    } else if (phase === 'break' || phase === 'longBreak') {
      // Break ended, start next work session
      setPhaseTimer('work', config.workMinutes)
    }
  }, [phase, setPhaseTimer])

  // 100ms interval for display updates using Date.now() arithmetic
  useEffect(() => {
    if (!isRunning || isPaused) return

    const interval = setInterval(() => {
      const elapsed = Date.now() - startedAtRef.current + pausedElapsedRef.current
      const remaining = Math.max(0, durationMsRef.current - elapsed)
      const secs = Math.ceil(remaining / 1000)
      setSecondsRemaining(secs)

      if (remaining <= 0) {
        clearInterval(interval)
        transitionToNextPhase()
      }
    }, 100)

    return () => clearInterval(interval)
  }, [isRunning, isPaused, transitionToNextPhase])

  const start = useCallback((config: PomodoroConfig) => {
    configRef.current = config
    sessionCountRef.current = 0
    setSessionCount(0)
    setPhaseTimer('work', config.workMinutes)
  }, [setPhaseTimer])

  const pause = useCallback(() => {
    if (!isRunning || isPaused) return
    // Accumulate elapsed time so far
    pausedElapsedRef.current += Date.now() - startedAtRef.current
    setIsPaused(true)
  }, [isRunning, isPaused])

  const resume = useCallback(() => {
    if (!isRunning || !isPaused) return
    // Reset startedAt; pausedElapsedRef already holds previously elapsed time
    startedAtRef.current = Date.now()
    setIsPaused(false)
  }, [isRunning, isPaused])

  const skip = useCallback(() => {
    if (!isRunning) return
    transitionToNextPhase()
  }, [isRunning, transitionToNextPhase])

  const reset = useCallback(() => {
    setPhase('idle')
    setSecondsRemaining(0)
    setTotalSeconds(0)
    setIsRunning(false)
    setIsPaused(false)
    pausedElapsedRef.current = 0
    startedAtRef.current = 0
    durationMsRef.current = 0
    // Keep sessionCount so the caller can read the final count
  }, [])

  return {
    phase,
    secondsRemaining,
    totalSeconds,
    sessionCount,
    isRunning,
    isPaused,
    start,
    pause,
    resume,
    skip,
    reset
  }
}
