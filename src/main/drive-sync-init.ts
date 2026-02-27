import { registerSyncableStore, markStoreModified, startPeriodicSync, stopPeriodicSync, syncAllStores } from './drive-sync'
import { hasDriveAppDataScope } from './google-auth'
import { store as habitStore } from './habit-store'
import { store as focusStore } from './focus-store'
import { store as mitStore } from './mit-store'
import { store as settingsStore } from './settings-store'
import { store as personaStore } from './persona-store'
import { store as ritualStore } from './ritual-store'
import { store as eodReviewStore } from './eod-review-store'
import { store as timeTrackingStore } from './time-tracking-store'
import { store as nudgeSettingsStore } from './nudge-engine'
import { store as weeklyReviewStore } from './weekly-review-store'

const syncableStores = [
  { name: 'habits', store: habitStore },
  { name: 'focus-sessions', store: focusStore },
  { name: 'mit-tasks', store: mitStore },
  { name: 'planner-settings', store: settingsStore, opts: { excludeKeys: ['apiKey'] } },
  { name: 'persona', store: personaStore },
  { name: 'daily-ritual', store: ritualStore },
  { name: 'eod-reviews', store: eodReviewStore },
  { name: 'time-tracking', store: timeTrackingStore },
  { name: 'nudge-settings', store: nudgeSettingsStore },
  { name: 'weekly-review-notif', store: weeklyReviewStore }
]

let initialized = false

export function initDriveSync(): void {
  if (!hasDriveAppDataScope()) return

  if (initialized) {
    startPeriodicSync()
    return
  }

  initialized = true

  for (const { name, store, opts } of syncableStores) {
    registerSyncableStore(name, store, opts)
    store.onDidAnyChange(() => {
      markStoreModified(name)
    })
  }

  startPeriodicSync()
}

export { stopPeriodicSync, syncAllStores }
