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
  createCalendarEvent: (calendarId: string, event: { summary: string; start: string; end: string; description?: string }) => Promise<{ success: boolean; data?: any; error?: string }>
  deleteCalendarEvent: (calendarId: string, eventId: string) => Promise<{ success: boolean; error?: string }>
  validateApiKey: (provider: string, apiKey: string) => Promise<{ success: boolean; error?: string }>
  generatePlan: (request: any) => Promise<{ success: boolean; data?: any; error?: string }>
  getPlannerSettings: () => Promise<{ success: boolean; data?: any; error?: string }>
  setPlannerSettings: (partial: any) => Promise<{ success: boolean; data?: any; error?: string }>
  getStartupEnabled: () => Promise<{ enabled: boolean }>
  setStartupEnabled: (enabled: boolean) => Promise<{ success: boolean }>
  hideWindow: () => Promise<void>
}

declare global {
  interface Window {
    api: ElectronAPI
  }
}

export {}
