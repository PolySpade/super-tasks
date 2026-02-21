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
  parent?: string
  children?: Task[]
}

export interface IpcResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
}
