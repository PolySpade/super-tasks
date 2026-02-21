import { ipcMain, Notification } from 'electron'
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
import { getCalendars, getEvents, createEvent, updateEvent, deleteEvent } from './google-calendar-api'
import { getSettings, updateSettings } from './settings-store'
import { generatePlan, validateApiKey, generateSubtasks, workBackwards, renameTasks } from './ai-planner'
import { getStartupEnabled, setStartupEnabled } from './startup'
import { hideWindow, toggleCalendarWindow, setAlwaysOnTop, getAlwaysOnTop } from './window'
import {
  logSession,
  getTodaySessions,
  getStats,
  getPomodoroSettings,
  setPomodoroSettings
} from './focus-store'

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

  // Calendar
  ipcMain.handle('calendar:get-calendars', async () => {
    try {
      const calendars = await getCalendars()
      return { success: true, data: calendars }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle(
    'calendar:get-events',
    async (_event, calendarId: string, timeMin: string, timeMax: string) => {
      try {
        const events = await getEvents(calendarId, timeMin, timeMax)
        return { success: true, data: events }
      } catch (error: any) {
        return { success: false, error: error.message }
      }
    }
  )

  ipcMain.handle(
    'calendar:create-event',
    async (
      _event,
      calendarId: string,
      eventData: { summary: string; start: string; end: string; description?: string }
    ) => {
      try {
        const created = await createEvent(calendarId, eventData)
        return { success: true, data: created }
      } catch (error: any) {
        return { success: false, error: error.message }
      }
    }
  )

  ipcMain.handle(
    'calendar:delete-event',
    async (_event, calendarId: string, eventId: string) => {
      try {
        await deleteEvent(calendarId, eventId)
        return { success: true }
      } catch (error: any) {
        return { success: false, error: error.message }
      }
    }
  )

  // AI Planner
  ipcMain.handle(
    'planner:validate-key',
    async (_event, provider: 'anthropic' | 'openai' | 'gemini', apiKey: string) => {
      try {
        await validateApiKey(provider, apiKey)
        return { success: true }
      } catch (error: any) {
        const msg = error.message || 'Invalid API key'
        return { success: false, error: msg }
      }
    }
  )

  ipcMain.handle('planner:generate', async (_event, request: any) => {
    try {
      const plan = await generatePlan(request)
      return { success: true, data: plan }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // Planner Settings
  ipcMain.handle('settings:get-planner', () => {
    try {
      const settings = getSettings()
      return { success: true, data: settings }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('settings:set-planner', (_event, partial: any) => {
    try {
      const settings = updateSettings(partial)
      return { success: true, data: settings }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

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

  ipcMain.handle('window:open-calendar', () => {
    toggleCalendarWindow()
  })

  ipcMain.handle('window:get-always-on-top', () => {
    return { enabled: getAlwaysOnTop() }
  })

  ipcMain.handle('window:set-always-on-top', (_event, enabled: boolean) => {
    setAlwaysOnTop(enabled)
    return { success: true }
  })

  // Calendar update
  ipcMain.handle(
    'calendar:update-event',
    async (
      _event,
      calendarId: string,
      eventId: string,
      updates: { start?: string; end?: string; summary?: string; description?: string }
    ) => {
      try {
        const updated = await updateEvent(calendarId, eventId, updates)
        return { success: true, data: updated }
      } catch (error: any) {
        return { success: false, error: error.message }
      }
    }
  )

  // Focus sessions
  ipcMain.handle('focus:log-session', (_event, session: any) => {
    try {
      logSession(session)
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('focus:get-today-sessions', () => {
    try {
      const sessions = getTodaySessions()
      return { success: true, data: sessions }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('focus:get-stats', () => {
    try {
      const stats = getStats()
      return { success: true, data: stats }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('focus:get-pomodoro-settings', () => {
    try {
      const settings = getPomodoroSettings()
      return { success: true, data: settings }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('focus:set-pomodoro-settings', (_event, partial: any) => {
    try {
      const settings = setPomodoroSettings(partial)
      return { success: true, data: settings }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // AI subtask generation
  ipcMain.handle('planner:generate-subtasks', async (_event, request: any) => {
    try {
      const result = await generateSubtasks(request)
      return { success: true, data: result }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('planner:work-backwards', async (_event, request: any) => {
    try {
      const result = await workBackwards(request)
      return { success: true, data: result }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // AI Rename
  ipcMain.handle('tasks:ai-rename', async (_event, tasks: any[]) => {
    try {
      const result = await renameTasks({ tasks })
      return { success: true, data: result }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // Notifications
  ipcMain.handle('notify', (_event, title: string, body: string) => {
    new Notification({ title, body }).show()
  })
}
