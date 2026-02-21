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
    event: { summary: string; start: string; end: string; description?: string }
  ) => ipcRenderer.invoke('calendar:create-event', calendarId, event),
  deleteCalendarEvent: (calendarId: string, eventId: string) =>
    ipcRenderer.invoke('calendar:delete-event', calendarId, eventId),

  // AI Planner
  validateApiKey: (provider: string, apiKey: string) =>
    ipcRenderer.invoke('planner:validate-key', provider, apiKey),
  generatePlan: (request: any) => ipcRenderer.invoke('planner:generate', request),

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
    updates: { start?: string; end?: string; summary?: string; description?: string }
  ) => ipcRenderer.invoke('calendar:update-event', calendarId, eventId, updates),

  // Focus sessions
  logFocusSession: (session: any) => ipcRenderer.invoke('focus:log-session', session),
  getFocusTodaySessions: () => ipcRenderer.invoke('focus:get-today-sessions'),
  getFocusStats: () => ipcRenderer.invoke('focus:get-stats'),
  getPomodoroSettings: () => ipcRenderer.invoke('focus:get-pomodoro-settings'),
  setPomodoroSettings: (partial: any) => ipcRenderer.invoke('focus:set-pomodoro-settings', partial),

  // AI rename
  aiRenameTasks: (tasks: { id: string; title: string; notes?: string }[]) =>
    ipcRenderer.invoke('tasks:ai-rename', tasks),

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
  setAlwaysOnTop: (enabled: boolean) => ipcRenderer.invoke('window:set-always-on-top', enabled)
}

contextBridge.exposeInMainWorld('api', api)
