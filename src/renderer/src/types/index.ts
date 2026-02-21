export interface TaskList {
  id: string
  title: string
}

export interface Task {
  id: string
  title: string
  status: 'needsAction' | 'completed'
  notes?: string
  due?: string
  completed?: string
  updated?: string
}

export interface IpcResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
}
