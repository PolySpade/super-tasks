import { useState, useEffect, useCallback, useMemo } from 'react'
import { Task } from '../types'

export function useTasks(signedIn: boolean, taskListId: string) {
  const [flatTasks, setFlatTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTasks = useCallback(async () => {
    if (!signedIn || !taskListId) return
    setLoading(true)
    setError(null)
    const result = await window.api.getTasks(taskListId)
    if (result.success && result.data) {
      setFlatTasks(
        result.data.map((t: any) => ({
          id: t.id,
          title: t.title,
          status: t.status,
          notes: t.notes || '',
          due: t.due || undefined,
          completed: t.completed,
          updated: t.updated,
          parent: t.parent || undefined
        }))
      )
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
      setFlatTasks((prev) => [tempTask, ...prev])

      const result = await window.api.createTask(taskListId, title, notes, due, parentId)
      if (result.success && result.data) {
        setFlatTasks((prev) =>
          prev.map((t) =>
            t.id === tempId
              ? {
                  id: result.data.id,
                  title: result.data.title,
                  status: result.data.status,
                  notes: result.data.notes || '',
                  due: result.data.due || undefined,
                  updated: result.data.updated,
                  parent: result.data.parent || undefined
                }
              : t
          )
        )
      } else {
        setFlatTasks((prev) => prev.filter((t) => t.id !== tempId))
        setError(result.error || 'Failed to create task')
      }
    },
    [taskListId]
  )

  const updateTask = useCallback(
    async (taskId: string, updates: { title?: string; notes?: string; due?: string | null }) => {
      if (!taskListId) return
      setFlatTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? {
                ...t,
                ...(updates.title !== undefined && { title: updates.title }),
                ...(updates.notes !== undefined && { notes: updates.notes }),
                ...(updates.due !== undefined && { due: updates.due || undefined })
              }
            : t
        )
      )

      const result = await window.api.updateTask(taskListId, taskId, updates)
      if (!result.success) {
        fetchTasks()
        setError(result.error || 'Failed to update task')
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
      setFlatTasks((t) => t.filter((task) => !idsToRemove.has(task.id)))

      const result = await window.api.deleteTask(taskListId, taskId)
      if (!result.success) {
        setFlatTasks(prev)
        setError(result.error || 'Failed to delete task')
      }
    },
    [taskListId, flatTasks]
  )

  const toggleComplete = useCallback(
    async (taskId: string, completed: boolean) => {
      if (!taskListId) return
      setFlatTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? { ...t, status: completed ? 'completed' : 'needsAction' }
            : t
        )
      )

      const result = await window.api.toggleTask(taskListId, taskId, completed)
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
    clearError: () => setError(null)
  }
}
