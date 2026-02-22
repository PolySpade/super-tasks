import { useState, useEffect, useCallback, useMemo } from 'react'
import { Task, TaskList } from '../types'

interface DashboardStats {
  dueToday: number
  overdue: number
  completedToday: number
  totalPending: number
}

interface WeeklyByList {
  name: string
  count: number
}

interface DashboardData {
  stats: DashboardStats
  recentCompleted: Task[]
  weeklyByList: WeeklyByList[]
  allTasks: Task[]
  loading: boolean
  error: string | null
  refresh: () => void
}

function isSameDay(dateStr: string, reference: Date): boolean {
  const d = new Date(dateStr)
  return (
    d.getFullYear() === reference.getFullYear() &&
    d.getMonth() === reference.getMonth() &&
    d.getDate() === reference.getDate()
  )
}

function isBeforeDay(dateStr: string, reference: Date): boolean {
  const d = new Date(dateStr)
  d.setHours(0, 0, 0, 0)
  const ref = new Date(reference)
  ref.setHours(0, 0, 0, 0)
  return d.getTime() < ref.getTime()
}

function isWithinWeek(dateStr: string, today: Date): boolean {
  const d = new Date(dateStr)
  d.setHours(0, 0, 0, 0)
  const start = new Date(today)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 7)
  return d.getTime() >= start.getTime() && d.getTime() < end.getTime()
}

export function useDashboardData(signedIn: boolean, taskLists: TaskList[]): DashboardData {
  const [allTasks, setAllTasks] = useState<(Task & { listTitle?: string })[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAllTasks = useCallback(async () => {
    if (!signedIn || taskLists.length === 0) return
    setLoading(true)
    setError(null)
    try {
      const collected: (Task & { listTitle?: string })[] = []
      for (const list of taskLists) {
        const result = await window.api.getTasks(list.id)
        if (result.success && result.data) {
          for (const t of result.data) {
            collected.push({
              id: t.id,
              title: t.title,
              status: t.status,
              notes: t.notes || undefined,
              due: t.due || undefined,
              completed: t.completed || undefined,
              updated: t.updated || undefined,
              parent: t.parent || undefined,
              listTitle: list.title
            })
          }
        }
      }
      setAllTasks(collected)
    } catch (err: any) {
      setError(err.message || 'Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }, [signedIn, taskLists])

  useEffect(() => {
    fetchAllTasks()
  }, [fetchAllTasks])

  const today = useMemo(() => new Date(), [])

  const stats = useMemo<DashboardStats>(() => {
    const dueToday = allTasks.filter(
      (t) => t.status === 'needsAction' && t.due && isSameDay(t.due, today)
    ).length

    const overdue = allTasks.filter(
      (t) => t.status === 'needsAction' && t.due && isBeforeDay(t.due, today)
    ).length

    const completedToday = allTasks.filter(
      (t) => t.status === 'completed' && t.completed && isSameDay(t.completed, today)
    ).length

    const totalPending = allTasks.filter((t) => t.status === 'needsAction').length

    return { dueToday, overdue, completedToday, totalPending }
  }, [allTasks, today])

  const recentCompleted = useMemo(() => {
    return allTasks
      .filter((t) => t.status === 'completed' && t.completed && isSameDay(t.completed, today))
      .sort((a, b) => {
        const aTime = a.completed ? new Date(a.completed).getTime() : 0
        const bTime = b.completed ? new Date(b.completed).getTime() : 0
        return bTime - aTime
      })
      .slice(0, 5)
  }, [allTasks, today])

  const weeklyByList = useMemo<WeeklyByList[]>(() => {
    const map = new Map<string, number>()
    for (const t of allTasks) {
      if (t.status === 'needsAction') {
        const name = t.listTitle || 'Unknown'
        map.set(name, (map.get(name) || 0) + 1)
      }
    }
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  }, [allTasks])

  return {
    stats,
    recentCompleted,
    weeklyByList,
    allTasks,
    loading,
    error,
    refresh: fetchAllTasks
  }
}
