import Store from 'electron-store'

export interface FocusSession {
  id: string
  taskId: string
  taskTitle: string
  startTime: string
  endTime: string
  durationMinutes: number
  completed: boolean
}

export interface FocusStats {
  todaySessions: number
  todayMinutes: number
  streak: number
  lastSessionDate: string | null
}

export interface PomodoroConfig {
  workMinutes: number
  breakMinutes: number
  longBreakMinutes: number
  sessionsBeforeLongBreak: number
  logToCalendar: boolean
}

const POMODORO_DEFAULTS: PomodoroConfig = {
  workMinutes: 25,
  breakMinutes: 5,
  longBreakMinutes: 15,
  sessionsBeforeLongBreak: 4,
  logToCalendar: false
}

const store = new Store({ name: 'focus-sessions' })

function getToday(): string {
  return new Date().toISOString().split('T')[0]
}

function getSessions(): FocusSession[] {
  const sessions = (store.get('sessions') as FocusSession[] | undefined) || []
  // Auto-prune sessions older than 30 days
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 30)
  const cutoffStr = cutoff.toISOString()
  const filtered = sessions.filter((s) => s.startTime >= cutoffStr)
  if (filtered.length !== sessions.length) {
    store.set('sessions', filtered)
  }
  return filtered
}

export function logSession(session: FocusSession): void {
  const sessions = getSessions()
  sessions.push(session)
  store.set('sessions', sessions)
}

export function getTodaySessions(): FocusSession[] {
  const today = getToday()
  return getSessions().filter((s) => s.startTime.startsWith(today) && s.completed)
}

export function getStats(): FocusStats {
  const sessions = getSessions().filter((s) => s.completed)
  const today = getToday()
  const todaySessions = sessions.filter((s) => s.startTime.startsWith(today))
  const todayMinutes = todaySessions.reduce((sum, s) => sum + s.durationMinutes, 0)

  // Calculate streak: consecutive days with >=1 completed session counting backwards from today
  const sessionDates = new Set(sessions.map((s) => s.startTime.split('T')[0]))
  let streak = 0
  const date = new Date()
  while (true) {
    const dateStr = date.toISOString().split('T')[0]
    if (sessionDates.has(dateStr)) {
      streak++
      date.setDate(date.getDate() - 1)
    } else {
      break
    }
  }

  const sortedSessions = [...sessions].sort((a, b) => b.startTime.localeCompare(a.startTime))
  const lastSessionDate = sortedSessions.length > 0 ? sortedSessions[0].startTime : null

  return { todaySessions: todaySessions.length, todayMinutes, streak, lastSessionDate }
}

export function getWeekSessions(): FocusSession[] {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 7)
  const cutoffStr = cutoff.toISOString().split('T')[0]
  return getSessions().filter((s) => s.completed && s.startTime.split('T')[0] >= cutoffStr)
}

export function getPomodoroSettings(): PomodoroConfig {
  const saved = store.get('pomodoroSettings') as Partial<PomodoroConfig> | undefined
  return { ...POMODORO_DEFAULTS, ...saved }
}

export function setPomodoroSettings(partial: Partial<PomodoroConfig>): PomodoroConfig {
  const current = getPomodoroSettings()
  const updated = { ...current, ...partial }
  store.set('pomodoroSettings', updated)
  return updated
}
