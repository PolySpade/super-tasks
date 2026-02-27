import { getAllHabits, isDueToday, getTodaysHabits, setHabitInstance } from './habit-store'
import { createTask } from './google-tasks-api'
import { appendMetaTag } from './task-meta-utils'

let schedulerInterval: ReturnType<typeof setInterval> | null = null

async function processHabits(): Promise<void> {
  const today = new Date().toISOString().split('T')[0]
  const todaysHabits = getTodaysHabits(today)

  for (const habit of todaysHabits) {
    // Only create task if no task ID exists for today
    if (!habit.taskId) {
      try {
        const notes = `Recurring habit (${habit.recurrence})`
        let fullNotes = notes
        if (habit.energyLevel || habit.timeBoxMinutes) {
          const meta: any = {}
          if (habit.energyLevel) meta.energyLevel = habit.energyLevel
          if (habit.timeBoxMinutes) meta.timeBoxMinutes = habit.timeBoxMinutes
          fullNotes = appendMetaTag(notes, meta)
        }

        const task = await createTask(
          habit.taskListId,
          habit.title,
          fullNotes
        )

        // Record the instance
        setHabitInstance(habit.id, today, task.id)
      } catch {
        // Task creation failed — will retry next cycle
      }
    }
  }
}

export function startHabitScheduler(): void {
  // Run immediately on startup
  processHabits().catch(() => {})

  // Then run every hour
  schedulerInterval = setInterval(() => {
    processHabits().catch(() => {})
  }, 60 * 60 * 1000)
}

export function stopHabitScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval)
    schedulerInterval = null
  }
}
