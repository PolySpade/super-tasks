import { globalShortcut } from 'electron'
import { showCaptureWindow } from './quick-capture-window'

export function registerQuickCaptureHotkey(hotkey: string): void {
  globalShortcut.unregisterAll()
  try {
    const success = globalShortcut.register(hotkey, () => {
      console.log('[quick-capture] Hotkey triggered:', hotkey)
      showCaptureWindow()
    })
    if (success) {
      console.log('[quick-capture] Hotkey registered:', hotkey)
    } else {
      console.warn('[quick-capture] Failed to register hotkey:', hotkey)
    }
  } catch (err) {
    console.error('[quick-capture] Hotkey registration error:', err)
  }
}
