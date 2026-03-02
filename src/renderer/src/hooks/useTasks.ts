import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Task, TaskMetadata } from '../types'
import { parseMetaTag, appendMetaTag } from '../utils/task-meta'

export function useTasks(signedIn: boolean, taskListId: string) {
  const [flatTasks, setFlatTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [metadataMap, setMetadataMap] = useState<Record<string, TaskMetadata>>({})
  const metaMapRef = useRef<Record<string, TaskMetadata>>({})
  const flatTasksRef = useRef<Task[]>([])

  const fetchTasks = useCallback(async () => {
    if (!signedIn || !taskListId) return
    setLoading(true)
    setError(null)
    const result = await window.api.getTasks(taskListId)
    if (result.success && result.data) {
      const newMetaMap: Record<string, TaskMetadata> = {}
      const parsed = result.data.map((t: any) => {
        const { cleanNotes, meta } = parseMetaTag(t.notes || '')
        if (meta.energyLevel || meta.timeBoxMinutes) {
          newMetaMap[t.id] = meta
        }
        return {
          id: t.id,
          title: t.title,
          status: t.status,
          notes: cleanNotes,
          due: t.due || undefined,
          completed: t.completed,
          updated: t.updated,
          parent: t.parent || undefined
        }
      })
      setFlatTasks(parsed)
      flatTasksRef.current = parsed
      metaMapRef.current = newMetaMap
      setMetadataMap(newMetaMap)
    } else {
      setError(result.error || 'Failed to load tasks')
    }
    setLoading(false)
  }, [signedIn, taskListId])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  // Build tree structure from flat list
  const tasks = useMemo(() => {
    const taskMap = new Map<string, Task>()
    const roots: Task[] = []

    // First pass: create map entries with empty children
    for (const t of flatTasks) {
      taskMap.set(t.id, { ...t, children: [] })
    }

    // Second pass: build tree
    for (const t of flatTasks) {
      const node = taskMap.get(t.id)!
      if (t.parent && taskMap.has(t.parent)) {
        taskMap.get(t.parent)!.children!.push(node)
      } else {
        roots.push(node)
      }
    }

    return roots
  }, [flatTasks])

  const addTask = useCallback(
    async (title: string, notes?: string, due?: string, parentId?: string) => {
      if (!taskListId) return
      const tempId = `temp-${Date.now()}`
      const tempTask: Task = { id: tempId, title, status: 'needsAction', notes, due, parent: parentId }
      setFlatTasks((prev) => {
        const newList = [tempTask, ...prev]
        flatTasksRef.current = newList
        return newList
      })

      const result = await window.api.createTask(taskListId, title, notes, due, parentId)
      if (result.success && result.data) {
        const { cleanNotes, meta } = parseMetaTag(result.data.notes || '')
        if (meta.energyLevel || meta.timeBoxMinutes) {
          metaMapRef.current = { ...metaMapRef.current, [result.data.id]: meta }
          setMetadataMap({ ...metaMapRef.current })
        }
        setFlatTasks((prev) => {
          const newList = prev.map((t) =>
            t.id === tempId
              ? {
                  id: result.data.id,
                  title: result.data.title,
                  status: result.data.status,
                  notes: cleanNotes,
                  due: result.data.due || undefined,
                  updated: result.data.updated,
                  parent: result.data.parent || undefined
                }
              : t
          )
          flatTasksRef.current = newList
          return newList
        })
      } else {
        setFlatTasks((prev) => {
          const newList = prev.filter((t) => t.id !== tempId)
          flatTasksRef.current = newList
          return newList
        })
        setError(result.error || 'Failed to create task')
      }
    },
    [taskListId]
  )

  const updateTask = useCallback(
    async (taskId: string, updates: { title?: string; notes?: string; due?: string | null }) => {
      if (!taskListId) return
      // Optimistic update with clean notes
      setFlatTasks((prev) => {
        const newList = prev.map((t) =>
          t.id === taskId
            ? {
                ...t,
                ...(updates.title !== undefined && { title: updates.title }),
                ...(updates.notes !== undefined && { notes: updates.notes }),
                ...(updates.due !== undefined && { due: updates.due || undefined })
              }
            : t
        )
        flatTasksRef.current = newList
        return newList
      })

      // Re-append meta before sending to API
      const apiUpdates = { ...updates }
      if (apiUpdates.notes !== undefined) {
        const meta = metaMapRef.current[taskId]
        if (meta) {
          apiUpdates.notes = appendMetaTag(apiUpdates.notes, meta)
        }
      }

      const result = await window.api.updateTask(taskListId, taskId, apiUpdates)
      if (!result.success) {
        fetchTasks()
        setError(result.error || 'Failed to update task')
      }
    },
    [taskListId, fetchTasks]
  )

  const setMeta = useCallback(
    async (taskId: string, partial: Partial<TaskMetadata>) => {
      if (!taskListId) return

      // Merge metadata
      const current = metaMapRef.current[taskId] || {}
      const merged: TaskMetadata = { ...current, ...partial }

      // Clean up undefined/zero values
      if (!merged.energyLevel) delete merged.energyLevel
      if (!merged.timeBoxMinutes) delete merged.timeBoxMinutes

      // Optimistic update
      const newMap = { ...metaMapRef.current }
      if (merged.energyLevel || merged.timeBoxMinutes) {
        newMap[taskId] = merged
      } else {
        delete newMap[taskId]
      }
      metaMapRef.current = newMap
      setMetadataMap(newMap)

      // Find the task's current clean notes
      const task = flatTasksRef.current.find((t) => t.id === taskId)
      const cleanNotes = task?.notes || ''
      const fullNotes = appendMetaTag(cleanNotes, merged)

      // Call API with updated notes
      const result = await window.api.updateTask(taskListId, taskId, { notes: fullNotes })
      if (!result.success) {
        fetchTasks()
      }
    },
    [taskListId, fetchTasks]
  )

  const removeTask = useCallback(
    async (taskId: string) => {
      if (!taskListId) return
      const prev = flatTasks
      // Remove the task and its children
      const idsToRemove = new Set<string>([taskId])
      for (const t of flatTasks) {
        if (t.parent && idsToRemove.has(t.parent)) {
          idsToRemove.add(t.id)
        }
      }
      setFlatTasks((t) => {
        const newList = t.filter((task) => !idsToRemove.has(task.id))
        flatTasksRef.current = newList
        return newList
      })

      const result = await window.api.deleteTask(taskListId, taskId)
      if (!result.success) {
        setFlatTasks(prev)
        flatTasksRef.current = prev
        setError(result.error || 'Failed to delete task')
      }
    },
    [taskListId, flatTasks]
  )

  const toggleComplete = useCallback(
    async (taskId: string, completed: boolean, overrideListId?: string) => {
      const listId = overrideListId || taskListId
      if (!listId) return
      setFlatTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? { ...t, status: completed ? 'completed' : 'needsAction' }
            : t
        )
      )

      let result = await window.api.toggleTask(listId, taskId, completed)

      // If task not found in current list, search all lists (MIT / cross-list tasks)
      if (!result.success && result.error?.includes('Not Found')) {
        const listsResult = await window.api.getTaskLists()
        if (listsResult.success && listsResult.data) {
          for (const list of listsResult.data) {
            if (list.id === listId) continue
            const retry = await window.api.toggleTask(list.id, taskId, completed)
            if (retry.success) {
              result = retry
              break
            }
          }
        }
      }

      if (!result.success) {
        setFlatTasks((prev) =>
          prev.map((t) =>
            t.id === taskId
              ? { ...t, status: completed ? 'needsAction' : 'completed' }
              : t
          )
        )
        setError(result.error || 'Failed to update task')
      }
    },
    [taskListId]
  )

  // Flat list for counting (includes subtasks)
  const allTasks = flatTasks

  return {
    tasks,
    allTasks,
    loading,
    error,
    addTask,
    updateTask,
    removeTask,
    toggleComplete,
    refreshTasks: fetchTasks,
    clearError: () => setError(null),
    metadataMap,
    setMeta
  }
}
