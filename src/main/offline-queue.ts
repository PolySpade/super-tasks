import Store from 'electron-store'
import { net } from 'electron'
import { randomUUID } from 'crypto'

export interface OfflineAction {
  id: string
  type: 'create' | 'update' | 'delete' | 'toggle'
  payload: Record<string, any>
  timestamp: number
}

const store = new Store<{ queue: OfflineAction[] }>({ name: 'offline-queue' })

function getQueue(): OfflineAction[] {
  return (store.get('queue') as OfflineAction[] | undefined) || []
}

function saveQueue(queue: OfflineAction[]): void {
  store.set('queue', queue)
}

export function enqueue(type: OfflineAction['type'], payload: Record<string, any>): string {
  const action: OfflineAction = { id: randomUUID(), type, payload, timestamp: Date.now() }
  const queue = getQueue()
  queue.push(action)
  saveQueue(queue)
  return action.id
}

export function dequeue(id: string): void {
  const queue = getQueue().filter((a) => a.id !== id)
  saveQueue(queue)
}

export function getPendingQueue(): OfflineAction[] {
  return getQueue()
}

export function isOnline(): boolean {
  return net.isOnline()
}

export function queueSize(): number {
  return getQueue().length
}
