import Store from 'electron-store'

export type RecurrenceType = 'daily' | 'weekdays' | 'weekly' | 'custom' | 'monthly'

export interface HabitDefinition {
  id: string
  title: string
  recurrence: RecurrenceType
  customDays?: number[] // 0=Sun, 1=Mon, ... 6=Sat
  monthDay?: number // 1-31 for monthly
  taskListId: string
  energyLevel?: 'high' | 'medium' | 'low'
  timeBoxMinutes?: number
  createdAt: string
  archived: boolean
}

export interface HabitInstance {
  habitId: string
  date: string // YYYY-MM-DD
  completed: boolean
  taskId?: string // Google Task ID if created
}

export const store = new Store({ name: 'habits' })

function getHabits(): HabitDefinition[] {
  return (store.get('habits') as HabitDefinition[] | undefined) || []
}

function getInstances(): HabitInstance[] {
  return (store.get('instances') as HabitInstance[] | undefined) || []
}

export function getAllHabits(): HabitDefinition[] {
  return getHabits().filter((h) => !h.archived)
}

export function createHabit(habit: Omit<HabitDefinition, 'id' | 'createdAt' | 'archived'>): HabitDefinition {
  const habits = getHabits()
  const newHabit: HabitDefinition = {
    ...habit,
    id: `habit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
    archived: false
  }
  habits.push(newHabit)
  store.set('habits', habits)
  return newHabit
}

export function updateHabit(id: string, updates: Partial<HabitDefinition>): HabitDefinition | null {
  const habits = getHabits()
  const idx = habits.findIndex((h) => h.id === id)
  if (idx === -1) return null
  habits[idx] = { ...habits[idx], ...updates }
  store.set('habits', habits)
  return habits[idx]
}

export function deleteHabit(id: string): void {
  const habits = getHabits()
  const idx = habits.findIndex((h) => h.id === id)
  if (idx !== -1) {
    habits[idx].archived = true
    store.set('habits', habits)
  }
}

export function isDueToday(habit: HabitDefinition, dateStr: string): boolean {
  const date = new Date(dateStr + 'T12:00:00')
  const day = date.getDay() // 0=Sun

  switch (habit.recurrence) {
    case 'daily':
      return true
    case 'weekdays':
      return day >= 1 && day <= 5
    case 'weekly':
      // Due on the same day of week as created
      const createdDay = new Date(habit.createdAt).getDay()
      return day === createdDay
    case 'custom':
      return habit.customDays?.includes(day) ?? false
    case 'monthly':
      return date.getDate() === (habit.monthDay || 1)
    default:
      return false
  }
}

export function getTodaysHabits(dateStr: string): (HabitDefinition & { completed: boolean; taskId?: string })[] {
  const habits = getAllHabits()
  const instances = getInstances()

  return habits
    .filter((h) => isDueToday(h, dateStr))
    .map((h) => {
      const instance = instances.find((i) => i.habitId === h.id && i.date === dateStr)
      return {
        ...h,
        completed: instance?.completed ?? false,
        taskId: instance?.taskId
      }
    })
}

export function completeHabit(habitId: string, dateStr: string, taskId?: string): void {
  const instances = getInstances()
  const existing = instances.find((i) => i.habitId === habitId && i.date === dateStr)
  if (existing) {
    existing.completed = true
    if (taskId) existing.taskId = taskId
  } else {
    instances.push({ habitId, date: dateStr, completed: true, taskId })
  }
  store.set('instances', instances)
}

export function uncompleteHabit(habitId: string, dateStr: string): void {
  const instances = getInstances()
  const existing = instances.find((i) => i.habitId === habitId && i.date === dateStr)
  if (existing) {
    existing.completed = false
  }
  store.set('instances', instances)
}

export function getStreak(habitId: string): number {
  const habit = getHabits().find((h) => h.id === habitId)
  if (!habit) return 0

  const instances = getInstances().filter((i) => i.habitId === habitId && i.completed)
  const completedDates = new Set(instances.map((i) => i.date))

  let streak = 0
  const date = new Date()

  while (true) {
    const dateStr = date.toISOString().split('T')[0]
    if (isDueToday(habit, dateStr)) {
      if (completedDates.has(dateStr)) {
        streak++
      } else {
        break
      }
    }
    date.setDate(date.getDate() - 1)
    // Don't check more than 365 days back
    if (streak > 365) break
    const daysBack = Math.round((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24))
    if (daysBack > 365) break
  }

  return streak
}

export function getAllStreaks(): Record<string, number> {
  const habits = getAllHabits()
  const streaks: Record<string, number> = {}
  for (const h of habits) {
    streaks[h.id] = getStreak(h.id)
  }
  return streaks
}

export function setHabitInstance(habitId: string, dateStr: string, taskId: string): void {
  const instances = getInstances()
  const existing = instances.find((i) => i.habitId === habitId && i.date === dateStr)
  if (existing) {
    existing.taskId = taskId
  } else {
    instances.push({ habitId, date: dateStr, completed: false, taskId })
  }
  store.set('instances', instances)
}
