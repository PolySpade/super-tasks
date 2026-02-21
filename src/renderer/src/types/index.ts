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

export interface CalendarEvent {
  id: string
  summary: string
  start: string
  end: string
  description?: string
  calendarId: string
}

export interface TimeBlock {
  taskId: string
  taskTitle: string
  start: string
  end: string
  reason: string
}

export interface DayPlan {
  blocks: TimeBlock[]
  summary: string
}

export interface PlannerSettings {
  aiProvider: 'anthropic' | 'openai' | 'gemini'
  aiApiKey: string
  workingHoursStart: string
  workingHoursEnd: string
  defaultCalendarId: string
  breakDurationMinutes: number
}
