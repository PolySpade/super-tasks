import { useState, useEffect, useCallback } from 'react'
import { TaskMetadata } from '../types'

export function useTaskMetadata() {
  const [metadataMap, setMetadataMap] = useState<Record<string, TaskMetadata>>({})

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const result = await window.api.getAllTaskMetadata()
      if (!cancelled && result?.data) {
        setMetadataMap(result.data)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const getMetadata = useCallback(
    (taskId: string): TaskMetadata | undefined => metadataMap[taskId],
    [metadataMap]
  )

  const setMetadata = useCallback(async (taskId: string, partial: Partial<TaskMetadata>) => {
    await window.api.setTaskMetadata(taskId, partial)
    setMetadataMap((prev) => ({
      ...prev,
      [taskId]: { ...prev[taskId], ...partial }
    }))
  }, [])

  const refreshMetadata = useCallback(async () => {
    const result = await window.api.getAllTaskMetadata()
    if (result?.data) {
      setMetadataMap(result.data)
    }
  }, [])

  return { metadataMap, getMetadata, setMetadata, refreshMetadata }
}
