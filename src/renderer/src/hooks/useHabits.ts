import { useState, useEffect, useCallback } from 'react'

interface HabitDefinition {
  id: string
  title: string
  recurrence: string
  customDays?: number[]
  monthDay?: number
  taskListId: string
  energyLevel?: 'high' | 'medium' | 'low'
  timeBoxMinutes?: number
  createdAt: string
}

interface TodayHabit extends HabitDefinition {
  completed: boolean
  taskId?: string
}

export function useHabits() {
  const [habits, setHabits] = useState<HabitDefinition[]>([])
  const [todaysHabits, setTodaysHabits] = useState<TodayHabit[]>([])
  const [streaks, setStreaks] = useState<Record<string, number>>({})
  const today = new Date().toISOString().split('T')[0]

  const refresh = useCallback(async () => {
    const [habitsResult, todayResult, streakResult] = await Promise.all([
      window.api.getHabits(),
      window.api.getTodaysHabits(today),
      window.api.getHabitStreaks()
    ])
    if (habitsResult?.data) setHabits(habitsResult.data)
    if (todayResult?.data) setTodaysHabits(todayResult.data)
    if (streakResult?.data) setStreaks(streakResult.data)
  }, [today])

  useEffect(() => {
    refresh()
  }, [refresh])

  const create = async (habit: Omit<HabitDefinition, 'id' | 'createdAt'>) => {
    await window.api.createHabit(habit)
    refresh()
  }

  const complete = async (habitId: string, taskId?: string) => {
    await window.api.completeHabit(habitId, today, taskId)
    refresh()
  }

  const uncomplete = async (habitId: string) => {
    await window.api.uncompleteHabit(habitId, today)
    refresh()
  }

  const remove = async (habitId: string) => {
    await window.api.deleteHabit(habitId)
    refresh()
  }

  return { habits, todaysHabits, streaks, create, complete, uncomplete, remove, refresh }
}
