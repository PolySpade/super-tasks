import { useState, useEffect } from 'react'

interface TaskTimeData {
  taskId: string
  totalMinutes: number
  sessionCount: number
  lastSessionDate: string
}

export function useTimeTracking() {
  const [timeData, setTimeData] = useState<Record<string, TaskTimeData>>({})

  const refresh = async () => {
    const result = await window.api.getAllTimeTracking()
    if (result.success && result.data) {
      setTimeData(result.data)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  return { timeData, refresh }
}
