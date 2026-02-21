import { useState, useCallback } from 'react'
import { GeneratedSubtask, WorkBackwardsPlan, CalendarEvent } from '../types'

type GeneratorState = 'idle' | 'generating' | 'done' | 'error'

export function useSubtaskGenerator() {
  const [subtasks, setSubtasks] = useState<GeneratedSubtask[]>([])
  const [schedule, setSchedule] = useState<WorkBackwardsPlan['schedule']>([])
  const [state, setState] = useState<GeneratorState>('idle')
  const [error, setError] = useState<string | null>(null)

  const generate = useCallback(
    async (taskTitle: string, notes?: string, deadline?: string) => {
      setState('generating')
      setError(null)
      setSubtasks([])
      setSchedule([])
      try {
        const result = await window.api.generateSubtasks({
          taskTitle,
          taskNotes: notes,
          deadline: deadline || ''
        })
        if (result.success && result.data) {
          setSubtasks(result.data.subtasks || result.data)
          setState('done')
        } else {
          setError(result.error || 'Failed to generate subtasks')
          setState('error')
        }
      } catch (err: any) {
        setError(err.message || 'Failed to generate subtasks')
        setState('error')
      }
    },
    []
  )

  const planBackwards = useCallback(
    async (
      taskTitle: string,
      notes: string | undefined,
      deadline: string,
      events: CalendarEvent[],
      workingHours: { start: string; end: string },
      breakMinutes: number,
      lunchBreak?: { start: string; end: string }
    ) => {
      setState('generating')
      setError(null)
      setSubtasks([])
      setSchedule([])
      try {
        const result = await window.api.workBackwards({
          taskTitle,
          taskNotes: notes,
          deadline,
          existingEvents: events,
          workingHours,
          breakMinutes,
          ...(lunchBreak && { lunchBreak })
        })
        if (result.success && result.data) {
          const plan = result.data as WorkBackwardsPlan
          setSubtasks(plan.subtasks || [])
          setSchedule(plan.schedule || [])
          setState('done')
        } else {
          setError(result.error || 'Failed to generate backward plan')
          setState('error')
        }
      } catch (err: any) {
        setError(err.message || 'Failed to generate backward plan')
        setState('error')
      }
    },
    []
  )

  const reset = useCallback(() => {
    setSubtasks([])
    setSchedule([])
    setState('idle')
    setError(null)
  }, [])

  return { subtasks, schedule, state, error, generate, planBackwards, reset }
}
