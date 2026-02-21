import Store from 'electron-store'

export type EnergyLevel = 'high' | 'medium' | 'low'

export interface TaskMetadata {
  energyLevel?: EnergyLevel
  timeBoxMinutes?: number
}

const store = new Store({ name: 'task-metadata' })

function getAll(): Record<string, TaskMetadata> {
  return (store.get('metadata') as Record<string, TaskMetadata> | undefined) || {}
}

export function getTaskMetadata(taskId: string): TaskMetadata | undefined {
  const all = getAll()
  return all[taskId]
}

export function setTaskMetadata(taskId: string, partial: Partial<TaskMetadata>): void {
  const all = getAll()
  const existing = all[taskId] || {}
  all[taskId] = { ...existing, ...partial }
  store.set('metadata', all)
}

export function getAllTaskMetadata(): Record<string, TaskMetadata> {
  return getAll()
}

export function deleteTaskMetadata(taskId: string): void {
  const all = getAll()
  delete all[taskId]
  store.set('metadata', all)
}
