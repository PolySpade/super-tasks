import { useState, useEffect, useCallback } from 'react'

const MAX_MITS = 3

function getDateKey(date?: Date): string {
  const d = date || new Date()
  return d.toISOString().split('T')[0]
}

export function useMITs(date?: Date) {
  const dateKey = getDateKey(date)
  const [mits, setMitsState] = useState<string[]>([])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const result = await window.api.getMITs(dateKey)
      if (!cancelled && result?.data) {
        setMitsState(result.data)
      }
    })()
    return () => { cancelled = true }
  }, [dateKey])

  const setMITs = useCallback(async (taskIds: string[]) => {
    const capped = taskIds.slice(0, MAX_MITS)
    await window.api.setMITs(dateKey, capped)
    setMitsState(capped)
  }, [dateKey])

  const addMIT = useCallback(async (taskId: string) => {
    if (mits.includes(taskId) || mits.length >= MAX_MITS) return
    const updated = [...mits, taskId]
    await window.api.setMITs(dateKey, updated)
    setMitsState(updated)
  }, [mits, dateKey])

  const removeMIT = useCallback(async (taskId: string) => {
    const updated = mits.filter((id) => id !== taskId)
    await window.api.setMITs(dateKey, updated)
    setMitsState(updated)
  }, [mits, dateKey])

  const isMIT = useCallback((taskId: string) => mits.includes(taskId), [mits])

  return { mits, setMITs, addMIT, removeMIT, isMIT }
}
