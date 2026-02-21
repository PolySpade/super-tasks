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
  colorId?: string
}

export interface TimeBlock {
  taskId: string
  taskTitle: string
  start: string
  end: string
  reason: string
}

export interface BlockTask {
  taskId: string
  taskTitle: string
  estimatedMinutes: number
}

export interface ContextBlock {
  blockName: string
  start: string
  end: string
  tasks: BlockTask[]
  reason: string
}

export interface DayPlan {
  blocks: ContextBlock[]
  summary: string
}

export interface PlannerSettings {
  aiProvider: 'anthropic' | 'openai' | 'gemini'
  aiApiKey: string
  workingHoursStart: string
  workingHoursEnd: string
  lunchBreakStart: string
  lunchBreakEnd: string
  defaultCalendarId: string
  breakDurationMinutes: number
}

export interface FocusSession {
  id: string
  taskId: string
  taskTitle: string
  startTime: string
  endTime: string
  durationMinutes: number
  completed: boolean
}

export interface FocusStats {
  todaySessions: number
  todayMinutes: number
  streak: number
  lastSessionDate: string | null
}

export interface PomodoroConfig {
  workMinutes: number
  breakMinutes: number
  longBreakMinutes: number
  sessionsBeforeLongBreak: number
  logToCalendar: boolean
}

export interface Deadline {
  id: string
  title: string
  dueDate: string
  source: 'task' | 'event'
  sourceId: string
  taskListId?: string
  urgency: 'overdue' | 'red' | 'yellow' | 'green'
  daysRemaining: number
  hoursRemaining?: number
  hasSubtasks: boolean
  children?: Task[]
}

export type EnergyLevel = 'high' | 'medium' | 'low'

export interface TaskMetadata {
  energyLevel?: EnergyLevel
  timeBoxMinutes?: number
}

export interface GeneratedSubtask {
  title: string
  estimatedMinutes: number
}

export interface WorkBackwardsPlan {
  subtasks: GeneratedSubtask[]
  schedule: { subtaskTitle: string; date: string; start: string; end: string }[]
}
