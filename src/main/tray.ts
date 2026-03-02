import { Tray, Menu, app, nativeImage } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { toggleWindow, getWindow, setQuitting } from './window'

let tray: Tray | null = null

export function createTray(): Tray {
  const iconPath = is.dev
    ? join(__dirname, '../../resources/tray-icon.png')
    : join(process.resourcesPath, 'tray-icon.png')

  let icon: Electron.NativeImage
  try {
    icon = nativeImage.createFromPath(iconPath)
    if (icon.isEmpty()) {
      icon = createFallbackIcon()
    } else {
      // Resize to appropriate tray size (16x16 on most platforms)
      icon = icon.resize({ width: 16, height: 16 })
    }
  } catch {
    icon = createFallbackIcon()
  }

  tray = new Tray(icon)
  tray.setToolTip('SuperTasks')

  tray.on('click', () => {
    toggleWindow(tray!.getBounds())
  })

  tray.on('right-click', () => {
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Open',
        click: () => toggleWindow(tray!.getBounds())
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          setQuitting(true)
          app.quit()
        }
      }
    ])
    tray!.popUpContextMenu(contextMenu)
  })

  return tray
}

function createFallbackIcon(): Electron.NativeImage {
  // Create a simple 16x16 icon programmatically
  const size = 16
  const canvas = Buffer.alloc(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      // Blue circle with checkmark appearance
      const cx = x - size / 2
      const cy = y - size / 2
      const dist = Math.sqrt(cx * cx + cy * cy)
      if (dist < size / 2 - 1) {
        canvas[i] = 66      // R
        canvas[i + 1] = 133  // G
        canvas[i + 2] = 244  // B
        canvas[i + 3] = 255  // A
      } else {
        canvas[i + 3] = 0    // transparent
      }
    }
  }
  return nativeImage.createFromBuffer(
    Buffer.from(canvas),
    { width: size, height: size }
  )
}

export function getTray(): Tray | null {
  return tray
}
