import { useState, useEffect, useCallback } from 'react'
import { Task } from '../types'

export function useTasks(signedIn: boolean, taskListId: string) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTasks = useCallback(async () => {
    if (!signedIn || !taskListId) return
    setLoading(true)
    setError(null)
    const result = await window.api.getTasks(taskListId)
    if (result.success && result.data) {
      setTasks(
        result.data.map((t: any) => ({
          id: t.id,
          title: t.title,
          status: t.status,
          notes: t.notes || '',
          due: t.due || undefined,
          completed: t.completed,
          updated: t.updated
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

  const addTask = useCallback(
    async (title: string, notes?: string, due?: string) => {
      if (!taskListId) return
      const tempId = `temp-${Date.now()}`
      const tempTask: Task = { id: tempId, title, status: 'needsAction', notes, due }
      setTasks((prev) => [tempTask, ...prev])

      const result = await window.api.createTask(taskListId, title, notes, due)
      if (result.success && result.data) {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === tempId
              ? {
                  id: result.data.id,
                  title: result.data.title,
                  status: result.data.status,
                  notes: result.data.notes || '',
                  due: result.data.due || undefined,
                  updated: result.data.updated
                }
              : t
          )
        )
      } else {
        setTasks((prev) => prev.filter((t) => t.id !== tempId))
        setError(result.error || 'Failed to create task')
      }
    },
    [taskListId]
  )

  const updateTask = useCallback(
    async (taskId: string, updates: { title?: string; notes?: string; due?: string | null }) => {
      if (!taskListId) return
      // Optimistic update
      setTasks((prev) =>
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
        fetchTasks() // Rollback by refetching
        setError(result.error || 'Failed to update task')
      }
    },
    [taskListId, fetchTasks]
  )

  const removeTask = useCallback(
    async (taskId: string) => {
      if (!taskListId) return
      const prev = tasks
      setTasks((t) => t.filter((task) => task.id !== taskId))

      const result = await window.api.deleteTask(taskListId, taskId)
      if (!result.success) {
        setTasks(prev)
        setError(result.error || 'Failed to delete task')
      }
    },
    [taskListId, tasks]
  )

  const toggleComplete = useCallback(
    async (taskId: string, completed: boolean) => {
      if (!taskListId) return
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? { ...t, status: completed ? 'completed' : 'needsAction' }
            : t
        )
      )

      const result = await window.api.toggleTask(taskListId, taskId, completed)
      if (!result.success) {
        setTasks((prev) =>
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

  return {
    tasks,
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
