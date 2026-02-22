import Store from 'electron-store'

export interface RitualHistory {
  date: string
  stepsCompleted: number
  droppedTaskIds: string[]
  mitTaskIds: string[]
}

const store = new Store({ name: 'daily-ritual' })

export function wasCompletedToday(): boolean {
  const today = new Date().toISOString().split('T')[0]
  return store.get('lastCompleted') === today
}

export function markComplete(): void {
  const today = new Date().toISOString().split('T')[0]
  store.set('lastCompleted', today)

  // Save to history
  const history = getHistory()
  if (!history.find((h) => h.date === today)) {
    history.push({
      date: today,
      stepsCompleted: 6,
      droppedTaskIds: [],
      mitTaskIds: []
    })
    // Keep last 30 days
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 30)
    const cutoffStr = cutoff.toISOString().split('T')[0]
    store.set('history', history.filter((h) => h.date >= cutoffStr))
  }
}

export function getHistory(): RitualHistory[] {
  return (store.get('history') as RitualHistory[] | undefined) || []
}
