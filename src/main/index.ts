import { app } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { createWindow, toggleWindow, getWindow } from './window'
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
  })

  // Prevent app from quitting when window is closed - empty handler stops default quit
  app.on('window-all-closed', () => {
    // Do nothing - keep app running in tray
  })
}
