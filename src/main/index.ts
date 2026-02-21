import { app, Notification } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import Store from 'electron-store'
import { createWindow, toggleWindow, getWindow, setQuitting } from './window'
import { createTray, getTray } from './tray'
import { registerIpcHandlers } from './ipc-handlers'
import { restoreSession } from './google-auth'
import dotenv from 'dotenv'
import { join } from 'path'

// Load .env from project root
dotenv.config({ path: join(__dirname, '../../.env') })

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
  })

  app.whenReady().then(async () => {
    electronApp.setAppUserModelId('com.google-tasks-app')

    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window)
    })

    registerIpcHandlers()
    createWindow()
    createTray()

    // Auto-restore session
    await restoreSession()

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
  })

  // Prevent app from quitting when window is closed - empty handler stops default quit
  app.on('window-all-closed', () => {
    // Do nothing - keep app running in tray
  })
}
