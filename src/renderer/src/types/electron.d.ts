interface ElectronAPI {
  signIn: () => Promise<{ success: boolean; error?: string }>
  signOut: () => Promise<{ success: boolean }>
  getAuthStatus: () => Promise<{ signedIn: boolean }>
  restoreSession: () => Promise<{ success: boolean }>
  getTaskLists: () => Promise<{ success: boolean; data?: any[]; error?: string }>
  getTasks: (taskListId: string) => Promise<{ success: boolean; data?: any[]; error?: string }>
  createTask: (taskListId: string, title: string, notes?: string, due?: string) => Promise<{ success: boolean; data?: any; error?: string }>
  updateTask: (taskListId: string, taskId: string, updates: { title?: string; notes?: string; due?: string | null }) => Promise<{ success: boolean; data?: any; error?: string }>
  deleteTask: (taskListId: string, taskId: string) => Promise<{ success: boolean; error?: string }>
  toggleTask: (taskListId: string, taskId: string, completed: boolean) => Promise<{ success: boolean; data?: any; error?: string }>
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
