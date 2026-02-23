import { app, globalShortcut, Notification } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import Store from 'electron-store'
import { createWindow, toggleWindow, getWindow, setQuitting } from './window'
import { processOfflineQueue } from './google-tasks-api'
import { isOnline, queueSize } from './offline-queue'
import { createTray, getTray } from './tray'
import { registerIpcHandlers } from './ipc-handlers'
import { restoreSession } from './google-auth'
import { showCaptureWindow } from './quick-capture-window'
import { startHabitScheduler, stopHabitScheduler } from './habit-scheduler'
import { startNudgeEngine, stopNudgeEngine } from './nudge-engine'
// Env vars are baked in at build time via electron.vite.config.ts define

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    const win = getWindow()
    const tray = getTray()
    if (win && tray) {
      toggleWindow(tray.getBounds())
    }
  })

  app.on('before-quit', () => {
    setQuitting(true)
    globalShortcut.unregisterAll()
    stopHabitScheduler()
    stopNudgeEngine()
  })

  app.whenReady().then(async () => {
    electronApp.setAppUserModelId('com.google-tasks-app')

    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window)
    })

    registerIpcHandlers()
    createWindow()
    createTray()

    // Register global quick capture hotkey
    const captureStore = new Store({ name: 'planner-settings' })
    const savedSettings = captureStore.get('settings') as any
    const hotkey = savedSettings?.quickCaptureHotkey || 'Ctrl+Shift+Space'
    try {
      globalShortcut.register(hotkey, () => {
        showCaptureWindow()
      })
    } catch {
      // Hotkey registration failed — silently ignore
    }

    // Auto-restore session
    await restoreSession()

    // Start habit scheduler
    startHabitScheduler()

    // Start nudge engine
    startNudgeEngine()

    // Show window unless launched with --hidden
    const launchedHidden = process.argv.includes('--hidden')
    if (!launchedHidden) {
      const tray = getTray()
      if (tray) {
        toggleWindow(tray.getBounds())
      }
    }

    // Sunday weekly review reminder
    const notifStore = new Store({ name: 'weekly-review-notif' })
    setInterval(() => {
      const now = new Date()
      if (now.getDay() === 0 && now.getHours() === 10) {
        const todayKey = now.toISOString().split('T')[0]
        if (notifStore.get('lastNotified') !== todayKey) {
          new Notification({
            title: 'Weekly Review',
            body: 'Time to review your week and plan ahead!'
          }).show()
          notifStore.set('lastNotified', todayKey)
        }
      }
    }, 60 * 60 * 1000) // Check every hour

    // Periodic offline queue processor (every 30s)
    setInterval(() => {
      if (isOnline() && queueSize() > 0) {
        processOfflineQueue().catch(() => {})
      }
    }, 30_000)
  })

  // Prevent app from quitting when window is closed - empty handler stops default quit
  app.on('window-all-closed', () => {
    // Do nothing - keep app running in tray
  })
}
