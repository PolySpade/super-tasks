import { Notification } from 'electron'
import Store from 'electron-store'
import { getMITs } from './mit-store'
import { getTodaySessions } from './focus-store'

export interface NudgeConfig {
  blockReminders: boolean
  mitReminders: boolean
  breakOverrun: boolean
  progressCelebration: boolean
  quietHoursStart: string // HH:MM
  quietHoursEnd: string // HH:MM
}

interface TodayPlanBlock {
  blockName: string
  start: string // HH:MM
  end: string
  tasks: { taskId: string; taskTitle: string }[]
}

const DEFAULTS: NudgeConfig = {
  blockReminders: true,
  mitReminders: true,
  breakOverrun: true,
  progressCelebration: true,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00'
}

const store = new Store({ name: 'nudge-settings' })
let nudgeInterval: ReturnType<typeof setInterval> | null = null
let todaysPlan: TodayPlanBlock[] = []
let breakStartTime: number | null = null
let lastNudgeKeys: Set<string> = new Set()
let totalTasksToday = 0
let completedTasksToday = 0

function getConfig(): NudgeConfig {
  const saved = store.get('config') as Partial<NudgeConfig> | undefined
  return { ...DEFAULTS, ...saved }
}

function setConfig(partial: Partial<NudgeConfig>): NudgeConfig {
  const current = getConfig()
  const updated = { ...current, ...partial }
  store.set('config', updated)
  return updated
}

function isQuietHours(config: NudgeConfig): boolean {
  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const [startH, startM] = config.quietHoursStart.split(':').map(Number)
  const [endH, endM] = config.quietHoursEnd.split(':').map(Number)
  const startMinutes = startH * 60 + startM
  const endMinutes = endH * 60 + endM

  if (startMinutes < endMinutes) {
    // Same day: e.g., 22:00-23:00
    return currentMinutes >= startMinutes && currentMinutes < endMinutes
  } else {
    // Overnight: e.g., 22:00-07:00
    return currentMinutes >= startMinutes || currentMinutes < endMinutes
  }
}

function sendNudge(key: string, title: string, body: string): void {
  if (lastNudgeKeys.has(key)) return
  lastNudgeKeys.add(key)
  // Clear dedup after 30 minutes
  setTimeout(() => lastNudgeKeys.delete(key), 30 * 60 * 1000)

  new Notification({ title, body }).show()
}

function checkNudges(): void {
  const config = getConfig()
  if (isQuietHours(config)) return

  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const today = now.toISOString().split('T')[0]

  // Block reminders: 5 minutes before a block starts
  if (config.blockReminders && todaysPlan.length > 0) {
    for (const block of todaysPlan) {
      const [bh, bm] = block.start.split(':').map(Number)
      const blockStart = bh * 60 + bm
      const diff = blockStart - currentMinutes

      if (diff > 0 && diff <= 5) {
        const taskNames = block.tasks.map((t) => t.taskTitle).join(', ')
        sendNudge(
          `block-${block.start}`,
          `${block.blockName} starts in ${diff} min`,
          taskNames ? `Tasks: ${taskNames}` : 'Time to get ready!'
        )
      }
    }
  }

  // MIT reminder: if frog (MIT #1) not started by 10:30 AM
  if (config.mitReminders) {
    const mits = getMITs(today)
    if (mits.length > 0 && currentMinutes >= 630 && currentMinutes < 660) {
      const sessions = getTodaySessions()
      const frogStarted = sessions.some((s) => s.taskId === mits[0])
      if (!frogStarted) {
        sendNudge(
          'frog-reminder',
          "Haven't started your Frog yet!",
          "It's getting late — tackle your #1 priority now."
        )
      }
    }
  }

  // Break overrun: if break started more than 15 minutes ago
  if (config.breakOverrun && breakStartTime) {
    const breakMinutes = (Date.now() - breakStartTime) / (1000 * 60)
    if (breakMinutes >= 15) {
      sendNudge(
        'break-overrun',
        'Break time is up!',
        `You've been on break for ${Math.round(breakMinutes)} min — ready to focus?`
      )
    }
  }

  // Progress celebration
  if (config.progressCelebration && totalTasksToday > 0) {
    const sessions = getTodaySessions()
    const newCompleted = sessions.length
    if (newCompleted > completedTasksToday && newCompleted > 0 && newCompleted % 3 === 0) {
      completedTasksToday = newCompleted
      sendNudge(
        `progress-${newCompleted}`,
        'Great work!',
        `${newCompleted} focus sessions completed today. Keep it up!`
      )
    }
  }
}

export function startNudgeEngine(): void {
  // Reset daily state
  lastNudgeKeys = new Set()
  completedTasksToday = 0

  // Check every 60 seconds
  nudgeInterval = setInterval(checkNudges, 60 * 1000)
}

export function stopNudgeEngine(): void {
  if (nudgeInterval) {
    clearInterval(nudgeInterval)
    nudgeInterval = null
  }
}

export function setTodaysPlan(blocks: TodayPlanBlock[]): void {
  todaysPlan = blocks
  totalTasksToday = blocks.reduce((sum, b) => sum + b.tasks.length, 0)
}

export function reportBreakStart(): void {
  breakStartTime = Date.now()
}

export function reportBreakEnd(): void {
  breakStartTime = null
}

export function reportTaskComplete(): void {
  completedTasksToday++
}

export { getConfig as getNudgeConfig, setConfig as setNudgeConfig }
