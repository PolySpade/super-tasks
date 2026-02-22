import { useState, useCallback } from 'react'
import { DayPlan, ContextBlock, CalendarEvent, Task, PlannerSettings } from '../types'

type PlanState = 'idle' | 'generating' | 'review' | 'confirming' | 'done' | 'error'

function getBlockColorId(blockName: string): string {
  const name = blockName.toLowerCase()
  if (name.includes('deep work') || name.includes('focus')) return '9'
  if (name.includes('communication') || name.includes('meeting')) return '4'
  if (name.includes('admin') || name.includes('planning')) return '2'
  if (name.includes('creative')) return '3'
  if (name.includes('review')) return '7'
  return '6'
}

function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number)
  const total = h * 60 + m + minutes
  const newH = Math.floor(total / 60) % 24
  const newM = total % 60
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`
}

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
          lunchBreak: {
            start: settings.lunchBreakStart,
            end: settings.lunchBreakEnd
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

  const startManualPlan = useCallback(() => {
    setPlan({ blocks: [], summary: '' })
    setState('review')
    setError(null)
  }, [])

  const addBlock = useCallback(
    ({ blockName, start, end }: { blockName: string; start: string; end: string }) => {
      setPlan((prev) => {
        const base = prev || { blocks: [], summary: '' }
        const newBlock: ContextBlock = { blockName, start, end, tasks: [], reason: '' }
        const blocks = [...base.blocks, newBlock].sort((a, b) => a.start.localeCompare(b.start))
        return { ...base, blocks }
      })
    },
    []
  )

  const editBlock = useCallback(
    (index: number, { blockName, start, end }: { blockName: string; start: string; end: string }) => {
      setPlan((prev) => {
        if (!prev) return prev
        const blocks = [...prev.blocks]
        blocks[index] = { ...blocks[index], blockName, start, end }
        blocks.sort((a, b) => a.start.localeCompare(b.start))
        return { ...prev, blocks }
      })
    },
    []
  )

  const rejectBlock = useCallback(
    (index: number) => {
      if (!plan) return
      setPlan({
        ...plan,
        blocks: plan.blocks.filter((_: ContextBlock, i: number) => i !== index)
      })
    },
    [plan]
  )

  const rejectTask = useCallback(
    (blockIndex: number, taskIndex: number) => {
      if (!plan) return
      const block = plan.blocks[blockIndex]
      if (!block) return
      const newTasks = block.tasks.filter((_, i) => i !== taskIndex)
      if (newTasks.length === 0) {
        // Remove entire block if no tasks remain
        setPlan({
          ...plan,
          blocks: plan.blocks.filter((_, i) => i !== blockIndex)
        })
      } else {
        // Recalculate block end time from remaining task estimates
        const totalMinutes = newTasks.reduce((sum, t) => sum + t.estimatedMinutes, 0)
        const newEnd = addMinutesToTime(block.start, totalMinutes)
        const newBlocks = [...plan.blocks]
        newBlocks[blockIndex] = { ...block, tasks: newTasks, end: newEnd }
        setPlan({ ...plan, blocks: newBlocks })
      }
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
          const parts: string[] = []
          if (block.reason) parts.push(block.reason)
          if (block.tasks.length > 0) {
            const taskList = block.tasks
              .map((t) => `- ${t.taskTitle} (~${t.estimatedMinutes} min)`)
              .join('\n')
            parts.push(`Tasks:\n${taskList}`)
          }
          const description = parts.join('\n\n')
          const result = await window.api.createCalendarEvent(calendarId, {
            summary: block.blockName,
            start: `${today}T${block.start}:00`,
            end: `${today}T${block.end}:00`,
            description,
            colorId: getBlockColorId(block.blockName)
          })
          if (!result.success) {
            throw new Error(result.error || `Failed to create event: ${block.blockName}`)
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

  return { plan, state, error, generatePlan, confirmPlan, rejectBlock, rejectTask, reset, startManualPlan, addBlock, editBlock }
}
