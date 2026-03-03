import { contextBridge, ipcRenderer } from 'electron'

const api = {
  // Auth
  signIn: () => ipcRenderer.invoke('auth:sign-in'),
  signOut: () => ipcRenderer.invoke('auth:sign-out'),
  getAuthStatus: () => ipcRenderer.invoke('auth:status'),
  restoreSession: () => ipcRenderer.invoke('auth:restore'),

  // Task Lists
  getTaskLists: () => ipcRenderer.invoke('tasks:get-lists'),

  // Tasks
  getTasks: (taskListId: string) => ipcRenderer.invoke('tasks:get', taskListId),
  createTask: (taskListId: string, title: string, notes?: string, due?: string, parentId?: string) =>
    ipcRenderer.invoke('tasks:create', taskListId, title, notes, due, parentId),
  updateTask: (taskListId: string, taskId: string, updates: { title?: string; notes?: string; due?: string | null }) =>
    ipcRenderer.invoke('tasks:update', taskListId, taskId, updates),
  moveTask: (taskListId: string, taskId: string, parentId?: string, previousId?: string) =>
    ipcRenderer.invoke('tasks:move', taskListId, taskId, parentId, previousId),
  deleteTask: (taskListId: string, taskId: string) =>
    ipcRenderer.invoke('tasks:delete', taskListId, taskId),
  toggleTask: (taskListId: string, taskId: string, completed: boolean) =>
    ipcRenderer.invoke('tasks:toggle', taskListId, taskId, completed),

  // Calendar
  getCalendars: () => ipcRenderer.invoke('calendar:get-calendars'),
  getCalendarEvents: (calendarId: string, timeMin: string, timeMax: string) =>
    ipcRenderer.invoke('calendar:get-events', calendarId, timeMin, timeMax),
  createCalendarEvent: (
    calendarId: string,
    event: { summary: string; start: string; end: string; description?: string; colorId?: string }
  ) => ipcRenderer.invoke('calendar:create-event', calendarId, event),
  deleteCalendarEvent: (calendarId: string, eventId: string) =>
    ipcRenderer.invoke('calendar:delete-event', calendarId, eventId),

  // AI Planner
  validateApiKey: (provider: string, apiKey: string, ollamaBaseUrl?: string) =>
    ipcRenderer.invoke('planner:validate-key', provider, apiKey, ollamaBaseUrl),
  generatePlan: (request: any) => ipcRenderer.invoke('planner:generate', request),
  listOllamaModels: (baseUrl: string) => ipcRenderer.invoke('planner:list-ollama-models', baseUrl),

  // Planner Settings
  getPlannerSettings: () => ipcRenderer.invoke('settings:get-planner'),
  setPlannerSettings: (partial: any) => ipcRenderer.invoke('settings:set-planner', partial),

  // Settings
  getStartupEnabled: () => ipcRenderer.invoke('settings:get-startup'),
  setStartupEnabled: (enabled: boolean) =>
    ipcRenderer.invoke('settings:set-startup', enabled),

  // Calendar update
  updateCalendarEvent: (
    calendarId: string,
    eventId: string,
    updates: { start?: string; end?: string; summary?: string; description?: string; colorId?: string }
  ) => ipcRenderer.invoke('calendar:update-event', calendarId, eventId, updates),

  // Focus sessions
  logFocusSession: (session: any) => ipcRenderer.invoke('focus:log-session', session),
  getFocusTodaySessions: () => ipcRenderer.invoke('focus:get-today-sessions'),
  getFocusStats: () => ipcRenderer.invoke('focus:get-stats'),
  getPomodoroSettings: () => ipcRenderer.invoke('focus:get-pomodoro-settings'),
  setPomodoroSettings: (partial: any) => ipcRenderer.invoke('focus:set-pomodoro-settings', partial),

  // AI rename
  aiRenameTasks: (tasks: { id: string; title: string; notes?: string; listName?: string; due?: string; energyLevel?: string; parentTitle?: string; hasSubtasks?: boolean }[]) =>
    ipcRenderer.invoke('tasks:ai-rename', tasks),

  // AI sort to lists
  aiSortToLists: (tasks: any[], lists: any[]) =>
    ipcRenderer.invoke('tasks:ai-sort-lists', tasks, lists),

  // AI subtask generation
  generateSubtasks: (request: { taskTitle: string; taskNotes?: string; deadline: string }) =>
    ipcRenderer.invoke('planner:generate-subtasks', request),
  workBackwards: (request: any) => ipcRenderer.invoke('planner:work-backwards', request),

  // Calendar window
  openCalendarWindow: () => ipcRenderer.invoke('window:open-calendar'),

  // Notifications
  notify: (title: string, body: string) => ipcRenderer.invoke('notify', title, body),

  // Window
  hideWindow: () => ipcRenderer.invoke('window:hide'),
  getAlwaysOnTop: () => ipcRenderer.invoke('window:get-always-on-top'),
  setAlwaysOnTop: (enabled: boolean) => ipcRenderer.invoke('window:set-always-on-top', enabled),
  setWindowSize: (width: number, height: number) => ipcRenderer.invoke('window:set-size', width, height),
  getWindowSize: () => ipcRenderer.invoke('window:get-size'),

  // MIT tasks
  getMITs: (date: string) => ipcRenderer.invoke('mit:get', date),
  setMITs: (date: string, taskIds: string[]) => ipcRenderer.invoke('mit:set', date, taskIds),
  clearMITs: (date: string) => ipcRenderer.invoke('mit:clear', date),

  // Focus week sessions
  getFocusWeekSessions: () => ipcRenderer.invoke('focus:get-week-sessions'),

  // Nudges
  getNudgeConfig: () => ipcRenderer.invoke('nudge:get-config'),
  setNudgeConfig: (partial: any) => ipcRenderer.invoke('nudge:set-config', partial),
  setTodaysPlan: (blocks: any[]) => ipcRenderer.invoke('nudge:set-todays-plan', blocks),
  reportBreakStart: () => ipcRenderer.invoke('nudge:report-break-start'),
  reportTaskComplete: () => ipcRenderer.invoke('nudge:report-task-complete'),

  // Daily ritual
  ritualWasCompletedToday: () => ipcRenderer.invoke('ritual:was-completed-today'),
  ritualMarkComplete: () => ipcRenderer.invoke('ritual:mark-complete'),
  ritualGetHistory: () => ipcRenderer.invoke('ritual:get-history'),

  // End-of-day review
  eodWasDoneToday: () => ipcRenderer.invoke('eod:was-done-today'),
  eodSave: (review: any) => ipcRenderer.invoke('eod:save', review),
  eodGetRecent: (count?: number) => ipcRenderer.invoke('eod:get-recent', count),
  eodGetAverageRating: (days?: number) => ipcRenderer.invoke('eod:get-average-rating', days),
  eodGetMoodStats: () => ipcRenderer.invoke('eod:get-mood-stats'),
  eodSaveQuickMood: (rating: number) => ipcRenderer.invoke('eod:save-quick-mood', rating),

  // Habits
  getHabits: () => ipcRenderer.invoke('habits:get-all'),
  createHabit: (habit: any) => ipcRenderer.invoke('habits:create', habit),
  updateHabit: (id: string, updates: any) => ipcRenderer.invoke('habits:update', id, updates),
  deleteHabit: (id: string) => ipcRenderer.invoke('habits:delete', id),
  getTodaysHabits: (date: string) => ipcRenderer.invoke('habits:get-today', date),
  completeHabit: (habitId: string, date: string, taskId?: string) =>
    ipcRenderer.invoke('habits:complete', habitId, date, taskId),
  uncompleteHabit: (habitId: string, date: string) =>
    ipcRenderer.invoke('habits:uncomplete', habitId, date),
  getHabitStreaks: () => ipcRenderer.invoke('habits:get-streaks'),

  // Quick capture
  quickCapture: (input: string, overrides?: { listId?: string; energyLevel?: string; timeBoxMinutes?: number }) =>
    ipcRenderer.invoke('capture:submit', input, overrides),
  hideCaptureWindow: () => ipcRenderer.invoke('capture:hide'),
  setCaptureWindowSize: (width: number, height: number) => ipcRenderer.invoke('capture:set-size', width, height),

  // Persona
  getPersona: () => ipcRenderer.invoke('persona:get'),
  setPersona: (partial: any) => ipcRenderer.invoke('persona:set', partial),
  isPersonaConfigured: () => ipcRenderer.invoke('persona:is-configured'),

  // Time tracking
  getTimeTracking: (taskId: string) => ipcRenderer.invoke('time-tracking:get', taskId),
  getAllTimeTracking: () => ipcRenderer.invoke('time-tracking:get-all'),
  getHistoricalTimeData: () => ipcRenderer.invoke('time-tracking:get-historical'),

  // Window events
  onWindowShown: (callback: () => void) => {
    ipcRenderer.on('window:shown', callback)
    return () => { ipcRenderer.removeListener('window:shown', callback) }
  },

  // Offline queue
  getOfflineQueue: () => ipcRenderer.invoke('offline:get-queue'),
  processOfflineQueue: () => ipcRenderer.invoke('offline:process-now'),

  // Drive sync
  triggerSync: () => ipcRenderer.invoke('sync:trigger'),
  getSyncStatus: () => ipcRenderer.invoke('sync:status')
}

contextBridge.exposeInMainWorld('api', api)
