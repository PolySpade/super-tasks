import Store from 'electron-store'

export interface TaskTimeData {
  taskId: string
  totalMinutes: number
  sessionCount: number
  lastSessionDate: string
}

export const store = new Store({ name: 'time-tracking' })

function getAll(): Record<string, TaskTimeData> {
  return (store.get('tasks') as Record<string, TaskTimeData> | undefined) || {}
}

export function addTimeToTask(taskId: string, minutes: number): void {
  const all = getAll()
  const existing = all[taskId] || { taskId, totalMinutes: 0, sessionCount: 0, lastSessionDate: '' }
  existing.totalMinutes += minutes
  existing.sessionCount += 1
  existing.lastSessionDate = new Date().toISOString().split('T')[0]
  all[taskId] = existing
  store.set('tasks', all)
}

export function getTaskTimeData(taskId: string): TaskTimeData | undefined {
  return getAll()[taskId]
}

export function getAllTimeData(): Record<string, TaskTimeData> {
  return getAll()
}

export function getEstimationAccuracy(): { totalTasks: number; avgRatio: number; overEstimated: number; underEstimated: number; accurate: number } {
  const all = getAll()
  const entries = Object.values(all)
  if (entries.length === 0) {
    return { totalTasks: 0, avgRatio: 1, overEstimated: 0, underEstimated: 0, accurate: 0 }
  }

  // We need metadata to compare — this returns raw time data only
  // Accuracy is computed in the renderer with metadata context
  return {
    totalTasks: entries.length,
    avgRatio: 1,
    overEstimated: 0,
    underEstimated: 0,
    accurate: 0
  }
}

export function getHistoricalData(): { taskId: string; totalMinutes: number; sessionCount: number }[] {
  const all = getAll()
  return Object.values(all).map((d) => ({
    taskId: d.taskId,
    totalMinutes: d.totalMinutes,
    sessionCount: d.sessionCount
  }))
}
