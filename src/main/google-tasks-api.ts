import { google, tasks_v1 } from 'googleapis'
import { getAuthClient } from './google-auth'

function getTasksApi(): tasks_v1.Tasks {
  return google.tasks({ version: 'v1', auth: getAuthClient() })
}

export async function getTaskLists() {
  const api = getTasksApi()
  const res = await api.tasklists.list({ maxResults: 100 })
  return res.data.items || []
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
}

export async function updateTask(
  taskListId: string,
  taskId: string,
  updates: { title?: string; notes?: string; due?: string | null }
) {
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
  const api = getTasksApi()
  await api.tasks.delete({
    tasklist: taskListId,
    task: taskId
  })
}

export async function toggleTaskComplete(
  taskListId: string,
  taskId: string,
  completed: boolean
) {
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
}
