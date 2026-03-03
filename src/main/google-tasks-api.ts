import { google, tasks_v1 } from 'googleapis'
import { getAuthClient } from './google-auth'
import { enqueue, dequeue, getPendingQueue, isOnline, OfflineAction } from './offline-queue'

function getTasksApi(): tasks_v1.Tasks {
  return google.tasks({ version: 'v1', auth: getAuthClient() })
}

function isNetworkError(error: any): boolean {
  const msg = (error?.message || '').toLowerCase()
  return (
    !isOnline() ||
    error?.code === 'ENOTFOUND' ||
    error?.code === 'ENETUNREACH' ||
    error?.code === 'ECONNREFUSED' ||
    error?.code === 'ETIMEDOUT' ||
    msg.includes('network') ||
    msg.includes('enotfound') ||
    msg.includes('fetch failed')
  )
}

export async function getTaskLists() {
  const api = getTasksApi()
  const res = await api.tasklists.list({ maxResults: 100 })
  return res.data.items || []
}

export async function createTaskList(title: string) {
  const api = getTasksApi()
  const res = await api.tasklists.insert({ requestBody: { title } })
  return res.data
}

export async function deleteTaskList(taskListId: string) {
  const api = getTasksApi()
  await api.tasklists.delete({ tasklist: taskListId })
}

export async function getTasks(taskListId: string) {
  const api = getTasksApi()
  const res = await api.tasks.list({
    tasklist: taskListId,
    maxResults: 100,
    showCompleted: true,
    showHidden: false
  })
  return res.data.items || []
}

export async function createTask(
  taskListId: string,
  title: string,
  notes?: string,
  due?: string,
  parentId?: string
) {
  try {
    const api = getTasksApi()
    const requestBody: any = { title }
    if (notes) requestBody.notes = notes
    if (due) requestBody.due = new Date(due + 'T00:00:00.000Z').toISOString()
    const res = await api.tasks.insert({
      tasklist: taskListId,
      parent: parentId || undefined,
      requestBody
    })
    return res.data
  } catch (error: any) {
    if (isNetworkError(error)) {
      enqueue('create', { taskListId, title, notes, due, parentId })
      return { id: `offline-${Date.now()}`, title, notes, due, status: 'needsAction' }
    }
    throw error
  }
}

export async function updateTask(
  taskListId: string,
  taskId: string,
  updates: { title?: string; notes?: string; due?: string | null }
) {
  try {
    const api = getTasksApi()
    const requestBody: any = {}
    if (updates.title !== undefined) requestBody.title = updates.title
    if (updates.notes !== undefined) requestBody.notes = updates.notes
    if (updates.due !== undefined) {
      requestBody.due = updates.due ? new Date(updates.due + 'T00:00:00.000Z').toISOString() : null
    }
    const res = await api.tasks.patch({
      tasklist: taskListId,
      task: taskId,
      requestBody
    })
    return res.data
  } catch (error: any) {
    if (isNetworkError(error)) {
      enqueue('update', { taskListId, taskId, updates })
      return { id: taskId, ...updates }
    }
    throw error
  }
}

export async function moveTask(
  taskListId: string,
  taskId: string,
  parentId?: string,
  previousId?: string
) {
  const api = getTasksApi()
  const res = await api.tasks.move({
    tasklist: taskListId,
    task: taskId,
    parent: parentId || undefined,
    previous: previousId || undefined
  })
  return res.data
}

export async function deleteTask(taskListId: string, taskId: string) {
  try {
    const api = getTasksApi()
    await api.tasks.delete({
      tasklist: taskListId,
      task: taskId
    })
  } catch (error: any) {
    if (isNetworkError(error)) {
      enqueue('delete', { taskListId, taskId })
      return
    }
    throw error
  }
}

export async function toggleTaskComplete(
  taskListId: string,
  taskId: string,
  completed: boolean
) {
  try {
    const api = getTasksApi()
    const res = await api.tasks.patch({
      tasklist: taskListId,
      task: taskId,
      requestBody: {
        status: completed ? 'completed' : 'needsAction',
        completed: completed ? new Date().toISOString() : null
      }
    })
    return res.data
  } catch (error: any) {
    if (isNetworkError(error)) {
      enqueue('toggle', { taskListId, taskId, completed })
      return { id: taskId, status: completed ? 'completed' : 'needsAction' }
    }
    throw error
  }
}

export async function processOfflineQueue(): Promise<number> {
  if (!isOnline()) return 0

  const queue = getPendingQueue()
  if (queue.length === 0) return 0

  let processed = 0
  const api = getTasksApi()

  for (const action of queue) {
    try {
      switch (action.type) {
        case 'create': {
          const { taskListId, title, notes, due, parentId } = action.payload
          const requestBody: any = { title }
          if (notes) requestBody.notes = notes
          if (due) requestBody.due = new Date(due + 'T00:00:00.000Z').toISOString()
          await api.tasks.insert({
            tasklist: taskListId,
            parent: parentId || undefined,
            requestBody
          })
          break
        }
        case 'update': {
          const { taskListId, taskId, updates } = action.payload
          const requestBody: any = {}
          if (updates.title !== undefined) requestBody.title = updates.title
          if (updates.notes !== undefined) requestBody.notes = updates.notes
          if (updates.due !== undefined) {
            requestBody.due = updates.due
              ? new Date(updates.due + 'T00:00:00.000Z').toISOString()
              : null
          }
          await api.tasks.patch({ tasklist: taskListId, task: taskId, requestBody })
          break
        }
        case 'delete': {
          const { taskListId, taskId } = action.payload
          await api.tasks.delete({ tasklist: taskListId, task: taskId })
          break
        }
        case 'toggle': {
          const { taskListId, taskId, completed } = action.payload
          await api.tasks.patch({
            tasklist: taskListId,
            task: taskId,
            requestBody: {
              status: completed ? 'completed' : 'needsAction',
              completed: completed ? new Date().toISOString() : null
            }
          })
          break
        }
      }
      dequeue(action.id)
      processed++
    } catch {
      // Stop processing on first failure — remaining items stay queued
      break
    }
  }

  return processed
}
