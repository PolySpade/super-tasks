import { useState, useEffect, useCallback } from 'react'
import { TaskList } from '../types'

export function useTaskLists(signedIn: boolean) {
  const [taskLists, setTaskLists] = useState<TaskList[]>([])
  const [selectedListId, setSelectedListId] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  const fetchLists = useCallback(async () => {
    if (!signedIn) return
    setError(null)
    const result = await window.api.getTaskLists()
    if (result.success && result.data) {
      const lists = result.data.map((l: any) => ({ id: l.id, title: l.title }))
      setTaskLists(lists)
      if (lists.length > 0 && !selectedListId) {
        setSelectedListId(lists[0].id)
      }
    } else {
      setError(result.error || 'Failed to load task lists')
    }
  }, [signedIn, selectedListId])

  useEffect(() => {
    fetchLists()
  }, [signedIn])

  return { taskLists, selectedListId, setSelectedListId, refreshLists: fetchLists, error }
}
