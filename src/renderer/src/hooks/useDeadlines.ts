import { useState, useEffect, useCallback, useMemo } from 'react'
import { Deadline, Task, TaskList, CalendarEvent } from '../types'

function computeUrgency(daysRemaining: number): Deadline['urgency'] {
  if (daysRemaining < 0) return 'overdue'
  if (daysRemaining <= 1) return 'red'
  if (daysRemaining <= 3) return 'yellow'
  return 'green'
}

export function useDeadlines(signedIn: boolean, taskLists: TaskList[]) {
  const [tasks, setTasks] = useState<(Task & { taskListId: string })[]>([])
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!signedIn) return
    setLoading(true)
    setError(null)
    try {
      // Fetch tasks from all lists
      const collectedTasks: (Task & { taskListId: string })[] = []
      for (const list of taskLists) {
        const result = await window.api.getTasks(list.id)
        if (result.success && result.data) {
          for (const t of result.data) {
            collectedTasks.push({
              id: t.id,
              title: t.title,
              status: t.status,
              notes: t.notes || undefined,
              due: t.due || undefined,
              completed: t.completed || undefined,
              updated: t.updated || undefined,
              parent: t.parent || undefined,
              taskListId: list.id
            })
          }
        }
      }
      setTasks(collectedTasks)

      // Fetch calendar events for the next 14 days
      const now = new Date()
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const endRange = new Date(startOfDay)
      endRange.setDate(endRange.getDate() + 14)

      const eventsResult = await window.api.getCalendarEvents(
        'primary',
        startOfDay.toISOString(),
        endRange.toISOString()
      )
      if (eventsResult.success && eventsResult.data) {
        setEvents(eventsResult.data)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load deadlines')
    } finally {
      setLoading(false)
    }
  }, [signedIn, taskLists])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const deadlines = useMemo<Deadline[]>(() => {
    const now = new Date()
    const result: Deadline[] = []
    const seenTitles = new Set<string>()

    // Build deadlines from tasks with due dates
    for (const t of tasks) {
      if (t.status !== 'needsAction' || !t.due) continue

      const dueDate = new Date(t.due)
      const diffMs = dueDate.getTime() - now.getTime()
      const daysRemaining = Math.floor(diffMs / (1000 * 60 * 60 * 24))
      const hoursRemaining = Math.floor(diffMs / (1000 * 60 * 60))

      // Find children for this task
      const children = tasks.filter((child) => child.parent === t.id)

      result.push({
        id: `task-${t.id}`,
        title: t.title,
        dueDate: t.due,
        source: 'task',
        sourceId: t.id,
        taskListId: t.taskListId,
        urgency: computeUrgency(daysRemaining),
        daysRemaining,
        hoursRemaining: daysRemaining <= 1 ? hoursRemaining : undefined,
        hasSubtasks: children.length > 0,
        children: children.length > 0 ? children : undefined
      })

      seenTitles.add(t.title.toLowerCase().trim())
    }

    // Build deadlines from calendar events, deduplicating against task titles
    for (const e of events) {
      const normalizedSummary = e.summary.toLowerCase().trim()
      if (seenTitles.has(normalizedSummary)) continue

      const eventDate = new Date(e.end || e.start)
      const diffMs = eventDate.getTime() - now.getTime()
      const daysRemaining = Math.floor(diffMs / (1000 * 60 * 60 * 24))
      const hoursRemaining = Math.floor(diffMs / (1000 * 60 * 60))

      result.push({
        id: `event-${e.id}`,
        title: e.summary,
        dueDate: e.end || e.start,
        source: 'event',
        sourceId: e.id,
        urgency: computeUrgency(daysRemaining),
        daysRemaining,
        hoursRemaining: daysRemaining <= 1 ? hoursRemaining : undefined,
        hasSubtasks: false
      })

      seenTitles.add(normalizedSummary)
    }

    // Sort by dueDate ascending
    result.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())

    return result
  }, [tasks, events])

  return { deadlines, loading, error, refresh: fetchData }
}
