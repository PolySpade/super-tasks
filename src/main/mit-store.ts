import Store from 'electron-store'

const MAX_MITS = 3
export const store = new Store({ name: 'mit-tasks' })

function getAllDates(): Record<string, string[]> {
  return (store.get('dates') as Record<string, string[]> | undefined) || {}
}

export function getMITs(date: string): string[] {
  const all = getAllDates()
  return all[date] || []
}

export function setMITs(date: string, taskIds: string[]): void {
  const all = getAllDates()
  all[date] = taskIds.slice(0, MAX_MITS)
  store.set('dates', all)
}

export function clearMITs(date: string): void {
  const all = getAllDates()
  delete all[date]
  store.set('dates', all)
}
