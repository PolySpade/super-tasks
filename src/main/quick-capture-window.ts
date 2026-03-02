import { BrowserWindow, screen } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'

let captureWindow: BrowserWindow | null = null

export function createCaptureWindow(): BrowserWindow {
  if (captureWindow && !captureWindow.isDestroyed()) {
    captureWindow.show()
    captureWindow.focus()
    return captureWindow
  }

  const primaryDisplay = screen.getPrimaryDisplay()
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize

  const isLinux = process.platform === 'linux'

  captureWindow = new BrowserWindow({
    width: 524,
    height: 88,
    x: Math.round(screenWidth / 2 - 262),
    y: Math.round(screenHeight / 3),
    show: false,
    frame: false,
    resizable: false,
    maxHeight: 424,
    skipTaskbar: true,
    alwaysOnTop: true,
    transparent: !isLinux,
    backgroundColor: isLinux ? '#1a1a2e' : '#00000000',
    hasShadow: !isLinux,
    ...(isLinux ? { type: 'toolbar' as const } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  const query = '?view=quick-capture'
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    captureWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] + query)
  } else {
    captureWindow.loadFile(join(__dirname, '../renderer/index.html'), { search: query })
  }

  captureWindow.once('ready-to-show', () => {
    captureWindow?.show()
    captureWindow?.focus()
  })

  captureWindow.on('blur', () => {
    hideCaptureWindow()
  })

  captureWindow.on('closed', () => {
    captureWindow = null
  })

  return captureWindow
}

export function showCaptureWindow(): void {
  console.log('[quick-capture] showCaptureWindow called, existing:', !!captureWindow && !captureWindow?.isDestroyed())
  if (captureWindow && !captureWindow.isDestroyed()) {
    captureWindow.show()
    captureWindow.focus()
  } else {
    createCaptureWindow()
  }
}

export function hideCaptureWindow(): void {
  if (captureWindow && !captureWindow.isDestroyed()) {
    captureWindow.hide()
  }
}

export function getCaptureWindow(): BrowserWindow | null {
  return captureWindow
}

export function setCaptureWindowSize(width: number, height: number): void {
  if (captureWindow && !captureWindow.isDestroyed()) {
    captureWindow.setResizable(true)
    captureWindow.setSize(width, height, true)
    captureWindow.setResizable(false)
  }
}
