import { ipcMain, Notification } from 'electron'
import { signIn, signOut, isSignedIn, restoreSession } from './google-auth'
import {
  getTaskLists,
  createTaskList,
  deleteTaskList,
  getTasks,
  createTask,
  updateTask,
  moveTask,
  deleteTask,
  toggleTaskComplete,
  processOfflineQueue
} from './google-tasks-api'
import { getPendingQueue } from './offline-queue'
import { getCalendars, getEvents, createEvent, updateEvent, deleteEvent } from './google-calendar-api'
import { getSettings, updateSettings } from './settings-store'
import { getPersona, setPersona, isPersonaConfigured } from './persona-store'
import { generatePlan, validateApiKey, generateSubtasks, workBackwards, renameTasks, sortTasksToLists, listOllamaModels } from './ai-planner'
import { getStartupEnabled, setStartupEnabled } from './startup'
import { appendMetaTag } from './task-meta-utils'
import { getMITs, setMITs, clearMITs } from './mit-store'
import { getTaskTimeData, getAllTimeData, getHistoricalData } from './time-tracking-store'
import { parseCapture } from './quick-capture-parser'
import { hideCaptureWindow, setCaptureWindowSize } from './quick-capture-window'
import { wasDoneToday, saveReview, getRecentReviews, getAverageRating, getMoodStats, saveQuickMood } from './eod-review-store'
import { wasCompletedToday as ritualCompletedToday, markComplete as markRitualComplete, getHistory as getRitualHistory } from './ritual-store'
import { getNudgeConfig, setNudgeConfig, setTodaysPlan, reportBreakStart, reportTaskComplete } from './nudge-engine'
import {
  getAllHabits,
  createHabit,
  updateHabit,
  deleteHabit,
  getTodaysHabits,
  completeHabit,
  uncompleteHabit,
  getAllStreaks,
  isDueToday,
  setHabitInstance
} from './habit-store'
import { hideWindow, toggleCalendarWindow, setAlwaysOnTop, getAlwaysOnTop, setWindowSize, getWindowSize } from './window'
import { registerQuickCaptureHotkey } from './quick-capture-hotkey'
import {
  logSession,
  getTodaySessions,
  getStats,
  getWeekSessions,
  getPomodoroSettings,
  setPomodoroSettings
} from './focus-store'
import { hasDriveAppDataScope } from './google-auth'
import { syncAllStores, getLastSyncTime } from './drive-sync'
import { initDriveSync } from './drive-sync-init'

export function registerIpcHandlers(): void {
  // Auth
  ipcMain.handle('auth:sign-in', async () => {
    try {
      const success = await signIn()
      if (success) {
        initDriveSync()
      }
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

  ipcMain.handle('tasks:create-list', async (_event, title: string) => {
    try {
      const list = await createTaskList(title)
      return { success: true, data: list }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('tasks:delete-list', async (_event, taskListId: string) => {
    try {
      await deleteTaskList(taskListId)
      return { success: true }
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
      eventData: { summary: string; start: string; end: string; description?: string; colorId?: string }
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
    async (_event, provider: 'anthropic' | 'openai' | 'gemini' | 'ollama', apiKey: string, ollamaBaseUrl?: string) => {
      try {
        await validateApiKey(provider, apiKey, ollamaBaseUrl)
        return { success: true }
      } catch (error: any) {
        const msg = error.message || 'Invalid API key'
        return { success: false, error: msg }
      }
    }
  )

  ipcMain.handle(
    'planner:list-ollama-models',
    async (_event, baseUrl: string) => {
      try {
        const models = await listOllamaModels(baseUrl)
        return { success: true, data: models }
      } catch (error: any) {
        return { success: false, error: error.message }
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
      if (partial.quickCaptureHotkey) {
        registerQuickCaptureHotkey(partial.quickCaptureHotkey)
      }
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

  ipcMain.handle('window:set-size', (_event, width: number, height: number) => {
    setWindowSize(width, height)
    return { success: true }
  })

  ipcMain.handle('window:get-size', () => {
    return getWindowSize()
  })

  // Calendar update
  ipcMain.handle(
    'calendar:update-event',
    async (
      _event,
      calendarId: string,
      eventId: string,
      updates: { start?: string; end?: string; summary?: string; description?: string; colorId?: string }
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

  // AI Sort to Lists
  ipcMain.handle('tasks:ai-sort-lists', async (_event, tasks: any[], lists: any[]) => {
    try {
      const result = await sortTasksToLists({ tasks, lists })
      return { success: true, data: result }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // Persona
  ipcMain.handle('persona:get', () => {
    try {
      const persona = getPersona()
      return { success: true, data: persona }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('persona:set', (_event, partial: any) => {
    try {
      const persona = setPersona(partial)
      return { success: true, data: persona }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('persona:is-configured', () => {
    try {
      return { success: true, data: isPersonaConfigured() }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // Notifications
  ipcMain.handle('notify', (_event, title: string, body: string) => {
    new Notification({ title, body }).show()
  })

  ipcMain.handle('focus:get-week-sessions', () => {
    try {
      const sessions = getWeekSessions()
      return { success: true, data: sessions }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // MIT tasks
  ipcMain.handle('mit:get', (_event, date: string) => {
    try {
      const mits = getMITs(date)
      return { success: true, data: mits }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('mit:set', (_event, date: string, taskIds: string[]) => {
    try {
      setMITs(date, taskIds)
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('mit:clear', (_event, date: string) => {
    try {
      clearMITs(date)
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // Nudges
  ipcMain.handle('nudge:get-config', () => {
    try {
      const config = getNudgeConfig()
      return { success: true, data: config }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('nudge:set-config', (_event, partial: any) => {
    try {
      const config = setNudgeConfig(partial)
      return { success: true, data: config }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('nudge:set-todays-plan', (_event, blocks: any[]) => {
    try {
      setTodaysPlan(blocks)
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('nudge:report-break-start', () => {
    try {
      reportBreakStart()
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('nudge:report-task-complete', () => {
    try {
      reportTaskComplete()
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // Daily ritual
  ipcMain.handle('ritual:was-completed-today', () => {
    try {
      return { success: true, data: ritualCompletedToday() }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('ritual:mark-complete', () => {
    try {
      markRitualComplete()
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('ritual:get-history', () => {
    try {
      const history = getRitualHistory()
      return { success: true, data: history }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // End-of-day review
  ipcMain.handle('eod:was-done-today', () => {
    try {
      return { success: true, data: wasDoneToday() }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('eod:save', (_event, review: any) => {
    try {
      saveReview(review)
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('eod:get-recent', (_event, count?: number) => {
    try {
      const reviews = getRecentReviews(count)
      return { success: true, data: reviews }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('eod:get-average-rating', (_event, days?: number) => {
    try {
      const avg = getAverageRating(days)
      return { success: true, data: avg }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('eod:get-mood-stats', () => {
    try {
      const stats = getMoodStats()
      return { success: true, data: stats }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('eod:save-quick-mood', (_event, rating: number) => {
    try {
      saveQuickMood(rating)
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // Habits
  ipcMain.handle('habits:get-all', () => {
    try {
      const habits = getAllHabits()
      return { success: true, data: habits }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('habits:create', async (_event, habit: any) => {
    try {
      const created = createHabit(habit)
      const today = new Date().toISOString().split('T')[0]
      if (isDueToday(created, today)) {
        try {
          const notes = `Recurring habit (${created.recurrence})`
          let fullNotes = notes
          if (created.energyLevel || created.timeBoxMinutes) {
            const meta: any = {}
            if (created.energyLevel) meta.energyLevel = created.energyLevel
            if (created.timeBoxMinutes) meta.timeBoxMinutes = created.timeBoxMinutes
            fullNotes = appendMetaTag(notes, meta)
          }
          const task = await createTask(
            created.taskListId,
            created.title,
            fullNotes
          )
          setHabitInstance(created.id, today, task.id)
        } catch {
          // Task creation failed — scheduler will retry later
        }
      }
      return { success: true, data: created }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('habits:update', (_event, id: string, updates: any) => {
    try {
      const updated = updateHabit(id, updates)
      return { success: true, data: updated }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('habits:delete', (_event, id: string) => {
    try {
      deleteHabit(id)
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('habits:get-today', (_event, date: string) => {
    try {
      const habits = getTodaysHabits(date)
      return { success: true, data: habits }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('habits:complete', async (_event, habitId: string, date: string, taskId?: string) => {
    try {
      completeHabit(habitId, date, taskId)
      // Also complete the linked Google Task
      if (taskId) {
        const habit = getAllHabits().find((h) => h.id === habitId)
        if (habit?.taskListId) {
          toggleTaskComplete(habit.taskListId, taskId, true).catch(() => {})
        }
      }
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('habits:uncomplete', async (_event, habitId: string, date: string) => {
    try {
      // Get the taskId before uncompleting
      const todaysHabits = getTodaysHabits(date)
      const entry = todaysHabits.find((h) => h.id === habitId)
      uncompleteHabit(habitId, date)
      // Also uncomplete the linked Google Task
      if (entry?.taskId) {
        toggleTaskComplete(entry.taskListId, entry.taskId, false).catch(() => {})
      }
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('habits:get-streaks', () => {
    try {
      const streaks = getAllStreaks()
      return { success: true, data: streaks }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // Quick capture
  ipcMain.handle('capture:submit', async (_event, input: string, overrides?: { listId?: string; energyLevel?: string; timeBoxMinutes?: number } | null) => {
    try {
      const parsed = await parseCapture(input)
      const opts = overrides || {}

      // Apply manual overrides from the capture UI (always wins over parser)
      const finalEnergy = opts.energyLevel || parsed.energyLevel
      const finalTime = (typeof opts.timeBoxMinutes === 'number' && opts.timeBoxMinutes > 0)
        ? opts.timeBoxMinutes
        : parsed.timeBoxMinutes

      // Use override list if provided, otherwise fall back to default/first
      let listId = (typeof opts.listId === 'string' && opts.listId.length > 0) ? opts.listId : ''
      if (!listId) {
        const settingsStore = getSettings()
        listId = (settingsStore as any).quickCaptureDefaultListId || ''
      }
      if (!listId) {
        const lists = await getTaskLists()
        if (lists.length > 0) listId = lists[0].id
      }

      if (!listId) {
        return { success: false, error: 'No task list available' }
      }

      const timestamp = new Date().toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
      const notesBody = parsed.notes
        ? `Created: ${timestamp}\n${parsed.notes}`
        : `Created: ${timestamp}`
      let fullNotes = notesBody
      if (finalEnergy || finalTime) {
        const meta: any = {}
        if (finalEnergy) meta.energyLevel = finalEnergy
        if (finalTime) meta.timeBoxMinutes = finalTime
        fullNotes = appendMetaTag(notesBody, meta)
      }
      const task = await createTask(listId, parsed.title, fullNotes, parsed.due)

      new Notification({
        title: 'Task Captured',
        body: parsed.title
      }).show()

      return { success: true, data: task }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('capture:hide', () => {
    hideCaptureWindow()
  })

  ipcMain.handle('capture:set-size', (_event, width: number, height: number) => {
    setCaptureWindowSize(width, height)
  })

  // Offline queue
  ipcMain.handle('offline:get-queue', () => {
    try {
      const queue = getPendingQueue()
      return { success: true, data: queue }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('offline:process-now', async () => {
    try {
      const processed = await processOfflineQueue()
      return { success: true, data: processed }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // Drive sync
  ipcMain.handle('sync:trigger', async () => {
    try {
      await syncAllStores()
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('sync:status', () => {
    return {
      hasDriveScope: hasDriveAppDataScope(),
      lastSyncTime: getLastSyncTime()
    }
  })

  // Time tracking
  ipcMain.handle('time-tracking:get', (_event, taskId: string) => {
    try {
      const data = getTaskTimeData(taskId)
      return { success: true, data }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('time-tracking:get-all', () => {
    try {
      const data = getAllTimeData()
      return { success: true, data }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('time-tracking:get-historical', () => {
    try {
      const data = getHistoricalData()
      return { success: true, data }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })
}
