import { ipcMain } from 'electron'
import { signIn, signOut, isSignedIn, restoreSession } from './google-auth'
import {
  getTaskLists,
  getTasks,
  createTask,
  updateTask,
  moveTask,
  deleteTask,
  toggleTaskComplete
} from './google-tasks-api'
import { getStartupEnabled, setStartupEnabled } from './startup'
import { hideWindow } from './window'

export function registerIpcHandlers(): void {
  // Auth
  ipcMain.handle('auth:sign-in', async () => {
    try {
      const success = await signIn()
      return { success }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('auth:sign-out', () => {
    signOut()
    return { success: true }
  })

  ipcMain.handle('auth:status', async () => {
    const signedIn = isSignedIn()
    return { signedIn }
  })

  ipcMain.handle('auth:restore', async () => {
    try {
      const success = await restoreSession()
      return { success }
    } catch {
      return { success: false }
    }
  })

  // Task Lists
  ipcMain.handle('tasks:get-lists', async () => {
    try {
      const lists = await getTaskLists()
      return { success: true, data: lists }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // Tasks
  ipcMain.handle('tasks:get', async (_event, taskListId: string) => {
    try {
      const tasks = await getTasks(taskListId)
      return { success: true, data: tasks }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle(
    'tasks:create',
    async (_event, taskListId: string, title: string, notes?: string, due?: string, parentId?: string) => {
      try {
        const task = await createTask(taskListId, title, notes, due, parentId)
        return { success: true, data: task }
      } catch (error: any) {
        return { success: false, error: error.message }
      }
    }
  )

  ipcMain.handle(
    'tasks:update',
    async (_event, taskListId: string, taskId: string, updates: { title?: string; notes?: string; due?: string | null }) => {
      try {
        const task = await updateTask(taskListId, taskId, updates)
        return { success: true, data: task }
      } catch (error: any) {
        return { success: false, error: error.message }
      }
    }
  )

  ipcMain.handle(
    'tasks:move',
    async (_event, taskListId: string, taskId: string, parentId?: string, previousId?: string) => {
      try {
        const task = await moveTask(taskListId, taskId, parentId, previousId)
        return { success: true, data: task }
      } catch (error: any) {
        return { success: false, error: error.message }
      }
    }
  )

  ipcMain.handle(
    'tasks:delete',
    async (_event, taskListId: string, taskId: string) => {
      try {
        await deleteTask(taskListId, taskId)
        return { success: true }
      } catch (error: any) {
        return { success: false, error: error.message }
      }
    }
  )

  ipcMain.handle(
    'tasks:toggle',
    async (
      _event,
      taskListId: string,
      taskId: string,
      completed: boolean
    ) => {
      try {
        const task = await toggleTaskComplete(taskListId, taskId, completed)
        return { success: true, data: task }
      } catch (error: any) {
        return { success: false, error: error.message }
      }
    }
  )

  // Settings
  ipcMain.handle('settings:get-startup', () => {
    return { enabled: getStartupEnabled() }
  })

  ipcMain.handle('settings:set-startup', (_event, enabled: boolean) => {
    setStartupEnabled(enabled)
    return { success: true }
  })

  // Window
  ipcMain.handle('window:hide', () => {
    hideWindow()
  })
}
