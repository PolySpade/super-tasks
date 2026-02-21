import { useState, useCallback } from 'react'
import { DayPlan, TimeBlock, CalendarEvent, Task, PlannerSettings } from '../types'

type PlanState = 'idle' | 'generating' | 'review' | 'confirming' | 'done' | 'error'

export function usePlanner() {
  const [plan, setPlan] = useState<DayPlan | null>(null)
  const [state, setState] = useState<PlanState>('idle')
  const [error, setError] = useState<string | null>(null)

  const generatePlan = useCallback(
    async (
      tasks: Task[],
      events: CalendarEvent[],
      settings: PlannerSettings
    ) => {
      setState('generating')
      setError(null)
      try {
        const today = new Date().toISOString().split('T')[0]
        const incompleteTasks = tasks
          .filter((t) => t.status === 'needsAction')
          .map((t) => ({
            id: t.id,
            title: t.title,
            notes: t.notes,
            due: t.due
          }))

        const result = await window.api.generatePlan({
          date: today,
          tasks: incompleteTasks,
          existingEvents: events,
          workingHours: {
            start: settings.workingHoursStart,
            end: settings.workingHoursEnd
          },
          breakMinutes: settings.breakDurationMinutes
        })

        if (result.success && result.data) {
          setPlan(result.data)
          setState('review')
        } else {
          setError(result.error || 'Failed to generate plan')
          setState('error')
        }
      } catch (err: any) {
        setError(err.message || 'Failed to generate plan')
        setState('error')
      }
    },
    []
  )

  const rejectBlock = useCallback(
    (index: number) => {
      if (!plan) return
      setPlan({
        ...plan,
        blocks: plan.blocks.filter((_: TimeBlock, i: number) => i !== index)
      })
    },
    [plan]
  )

  const confirmPlan = useCallback(
    async (calendarId: string) => {
      if (!plan) return
      setState('confirming')
      setError(null)
      try {
        const today = new Date().toISOString().split('T')[0]
        for (const block of plan.blocks) {
          const result = await window.api.createCalendarEvent(calendarId, {
            summary: block.taskTitle,
            start: `${today}T${block.start}:00`,
            end: `${today}T${block.end}:00`,
            description: `Planned task: ${block.reason}`
          })
          if (!result.success) {
            throw new Error(result.error || `Failed to create event: ${block.taskTitle}`)
          }
        }
        setState('done')
      } catch (err: any) {
        setError(err.message || 'Failed to create calendar events')
        setState('error')
      }
    },
    [plan]
  )

  const reset = useCallback(() => {
    setPlan(null)
    setState('idle')
    setError(null)
  }, [])

  return { plan, state, error, generatePlan, confirmPlan, rejectBlock, reset }
}
