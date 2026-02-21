import { BrowserWindow, screen } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'

let mainWindow: BrowserWindow | null = null
let calendarWindow: BrowserWindow | null = null

export function createWindow(): BrowserWindow {
  mainWindow = new BrowserWindow({
    width: 380,
    height: 520,
    show: false,
    frame: false,
    resizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    transparent: false,
    backgroundColor: '#1e1e1e',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('blur', () => {
    mainWindow?.hide()
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}

export function toggleWindow(trayBounds: Electron.Rectangle): void {
  if (!mainWindow) return

  if (mainWindow.isVisible()) {
    mainWindow.hide()
    return
  }

  const { x, y } = calculatePosition(trayBounds)
  mainWindow.setPosition(x, y, false)
  mainWindow.show()
  mainWindow.focus()
}

function calculatePosition(trayBounds: Electron.Rectangle) {
  const windowBounds = mainWindow!.getBounds()
  const display = screen.getDisplayNearestPoint({
    x: trayBounds.x,
    y: trayBounds.y
  })
  const workArea = display.workArea

  let x = Math.round(trayBounds.x + trayBounds.width / 2 - windowBounds.width / 2)
  let y = Math.round(trayBounds.y - windowBounds.height - 4)

  // Keep within screen bounds
  if (x < workArea.x) x = workArea.x
  if (x + windowBounds.width > workArea.x + workArea.width) {
    x = workArea.x + workArea.width - windowBounds.width
  }
  if (y < workArea.y) {
    y = trayBounds.y + trayBounds.height + 4
  }

  return { x, y }
}

export function getWindow(): BrowserWindow | null {
  return mainWindow
}

export function hideWindow(): void {
  mainWindow?.hide()
}

export function createCalendarWindow(): BrowserWindow {
  calendarWindow = new BrowserWindow({
    width: 900,
    height: 700,
    show: false,
    frame: true,
    resizable: true,
    skipTaskbar: false,
    alwaysOnTop: false,
    backgroundColor: '#1e1e1e',
    title: 'Calendar',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  const query = '?view=calendar'
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    calendarWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] + query)
  } else {
    calendarWindow.loadFile(join(__dirname, '../renderer/index.html'), { search: query })
  }

  calendarWindow.on('closed', () => {
    calendarWindow = null
  })

  calendarWindow.once('ready-to-show', () => {
    calendarWindow?.show()
  })

  return calendarWindow
}

export function getCalendarWindow(): BrowserWindow | null {
  return calendarWindow
}

export function toggleCalendarWindow(): void {
  if (calendarWindow && !calendarWindow.isDestroyed()) {
    calendarWindow.focus()
  } else {
    createCalendarWindow()
  }
}
