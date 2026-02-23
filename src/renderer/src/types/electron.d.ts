interface ElectronAPI {
  signIn: () => Promise<{ success: boolean; error?: string }>
  signOut: () => Promise<{ success: boolean }>
  getAuthStatus: () => Promise<{ signedIn: boolean }>
  restoreSession: () => Promise<{ success: boolean }>
  getTaskLists: () => Promise<{ success: boolean; data?: any[]; error?: string }>
  getTasks: (taskListId: string) => Promise<{ success: boolean; data?: any[]; error?: string }>
  createTask: (taskListId: string, title: string, notes?: string, due?: string, parentId?: string) => Promise<{ success: boolean; data?: any; error?: string }>
  updateTask: (taskListId: string, taskId: string, updates: { title?: string; notes?: string; due?: string | null }) => Promise<{ success: boolean; data?: any; error?: string }>
  moveTask: (taskListId: string, taskId: string, parentId?: string, previousId?: string) => Promise<{ success: boolean; data?: any; error?: string }>
  deleteTask: (taskListId: string, taskId: string) => Promise<{ success: boolean; error?: string }>
  toggleTask: (taskListId: string, taskId: string, completed: boolean) => Promise<{ success: boolean; data?: any; error?: string }>
  getCalendars: () => Promise<{ success: boolean; data?: any[]; error?: string }>
  getCalendarEvents: (calendarId: string, timeMin: string, timeMax: string) => Promise<{ success: boolean; data?: any[]; error?: string }>
  createCalendarEvent: (calendarId: string, event: { summary: string; start: string; end: string; description?: string; colorId?: string }) => Promise<{ success: boolean; data?: any; error?: string }>
  updateCalendarEvent: (calendarId: string, eventId: string, updates: { start?: string; end?: string; summary?: string; description?: string; colorId?: string }) => Promise<{ success: boolean; data?: any; error?: string }>
  deleteCalendarEvent: (calendarId: string, eventId: string) => Promise<{ success: boolean; error?: string }>
  validateApiKey: (provider: string, apiKey: string) => Promise<{ success: boolean; error?: string }>
  generatePlan: (request: any) => Promise<{ success: boolean; data?: any; error?: string }>
  aiRenameTasks: (tasks: { id: string; title: string; notes?: string; listName?: string; due?: string; energyLevel?: string; parentTitle?: string; hasSubtasks?: boolean }[]) => Promise<{ success: boolean; data?: any; error?: string }>
  generateSubtasks: (request: { taskTitle: string; taskNotes?: string; deadline: string }) => Promise<{ success: boolean; data?: any; error?: string }>
  workBackwards: (request: { taskTitle: string; taskNotes?: string; deadline: string; existingEvents: any[]; workingHours: { start: string; end: string }; breakMinutes: number; lunchBreak?: { start: string; end: string } }) => Promise<{ success: boolean; data?: any; error?: string }>
  getPlannerSettings: () => Promise<{ success: boolean; data?: any; error?: string }>
  setPlannerSettings: (partial: any) => Promise<{ success: boolean; data?: any; error?: string }>
  getStartupEnabled: () => Promise<{ enabled: boolean }>
  setStartupEnabled: (enabled: boolean) => Promise<{ success: boolean }>
  hideWindow: () => Promise<void>
  openCalendarWindow: () => Promise<void>
  getAlwaysOnTop: () => Promise<{ enabled: boolean }>
  setAlwaysOnTop: (enabled: boolean) => Promise<{ success: boolean }>
  logFocusSession: (session: any) => Promise<{ success: boolean; error?: string }>
  getFocusTodaySessions: () => Promise<{ success: boolean; data?: any[]; error?: string }>
  getFocusStats: () => Promise<{ success: boolean; data?: any; error?: string }>
  getPomodoroSettings: () => Promise<{ success: boolean; data?: any; error?: string }>
  setPomodoroSettings: (partial: any) => Promise<{ success: boolean; data?: any; error?: string }>
  notify: (title: string, body: string) => Promise<void>

  // Nudges
  getNudgeConfig: () => Promise<{ success: boolean; data?: any; error?: string }>
  setNudgeConfig: (partial: any) => Promise<{ success: boolean; data?: any; error?: string }>
  setTodaysPlan: (blocks: any[]) => Promise<{ success: boolean; error?: string }>
  reportBreakStart: () => Promise<{ success: boolean; error?: string }>
  reportTaskComplete: () => Promise<{ success: boolean; error?: string }>

  // Daily ritual
  ritualWasCompletedToday: () => Promise<{ success: boolean; data?: boolean; error?: string }>
  ritualMarkComplete: () => Promise<{ success: boolean; error?: string }>
  ritualGetHistory: () => Promise<{ success: boolean; data?: any[]; error?: string }>

  // End-of-day review
  eodWasDoneToday: () => Promise<{ success: boolean; data?: boolean; error?: string }>
  eodSave: (review: any) => Promise<{ success: boolean; error?: string }>
  eodGetRecent: (count?: number) => Promise<{ success: boolean; data?: any[]; error?: string }>
  eodGetAverageRating: (days?: number) => Promise<{ success: boolean; data?: number | null; error?: string }>

  // Habits
  getHabits: () => Promise<{ success: boolean; data?: any[]; error?: string }>
  createHabit: (habit: any) => Promise<{ success: boolean; data?: any; error?: string }>
  updateHabit: (id: string, updates: any) => Promise<{ success: boolean; data?: any; error?: string }>
  deleteHabit: (id: string) => Promise<{ success: boolean; error?: string }>
  getTodaysHabits: (date: string) => Promise<{ success: boolean; data?: any[]; error?: string }>
  completeHabit: (habitId: string, date: string, taskId?: string) => Promise<{ success: boolean; error?: string }>
  uncompleteHabit: (habitId: string, date: string) => Promise<{ success: boolean; error?: string }>
  getHabitStreaks: () => Promise<{ success: boolean; data?: any; error?: string }>

  // Quick capture
  quickCapture: (input: string) => Promise<{ success: boolean; data?: any; error?: string }>
  hideCaptureWindow: () => Promise<void>

  // Time tracking
  getTimeTracking: (taskId: string) => Promise<{ success: boolean; data?: any; error?: string }>
  getAllTimeTracking: () => Promise<{ success: boolean; data?: any; error?: string }>
  getHistoricalTimeData: () => Promise<{ success: boolean; data?: any; error?: string }>
}

declare global {
  interface Window {
    api: ElectronAPI
  }
}

export {}
