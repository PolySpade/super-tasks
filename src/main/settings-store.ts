import Store from 'electron-store'
import { safeStorage } from 'electron'

export interface PlannerSettings {
  aiProvider: 'anthropic' | 'openai' | 'gemini' | 'ollama'
  aiApiKey: string
  workingHoursStart: string
  workingHoursEnd: string
  lunchBreakStart: string
  lunchBreakEnd: string
  defaultCalendarId: string
  breakDurationMinutes: number
  quickCaptureHotkey: string
  quickCaptureDefaultListId: string
  ollamaBaseUrl: string
  ollamaModel: string
  renameTags: string[]
}

const DEFAULTS: PlannerSettings = {
  aiProvider: 'anthropic',
  aiApiKey: '',
  workingHoursStart: '09:00',
  workingHoursEnd: '17:00',
  lunchBreakStart: '12:00',
  lunchBreakEnd: '13:00',
  defaultCalendarId: 'primary',
  breakDurationMinutes: 15,
  quickCaptureHotkey: 'Ctrl+Shift+Space',
  quickCaptureDefaultListId: '',
  ollamaBaseUrl: 'http://localhost:11434',
  ollamaModel: '',
  renameTags: ['Review', 'Write', 'Fix', 'Call', 'Research', 'Design', 'Plan', 'Build', 'Test', 'Ship']
}

export const store = new Store({ name: 'planner-settings' })

export function getSettings(): PlannerSettings {
  const saved = store.get('settings') as Partial<PlannerSettings> | undefined
  const apiKey = getDecryptedApiKey()
  return {
    ...DEFAULTS,
    ...saved,
    aiApiKey: apiKey ? '••••••••' : ''
  }
}

export function updateSettings(partial: Partial<PlannerSettings>): PlannerSettings {
  const current = store.get('settings') as Partial<PlannerSettings> | undefined
  const merged = { ...DEFAULTS, ...current }

  if (partial.aiApiKey !== undefined && partial.aiApiKey !== '••••••••') {
    if (partial.aiApiKey) {
      const encrypted = safeStorage.encryptString(partial.aiApiKey)
      store.set('apiKey', encrypted.toString('base64'))
    } else {
      store.delete('apiKey')
    }
  }

  const { aiApiKey, ...rest } = partial
  const updated = { ...merged, ...rest }
  const { aiApiKey: _, ...toSave } = updated
  store.set('settings', toSave)

  return {
    ...updated,
    aiApiKey: getDecryptedApiKey() ? '••••••••' : ''
  }
}

export function getDecryptedApiKey(): string {
  const data = store.get('apiKey') as string | undefined
  if (!data) return ''
  try {
    const buffer = Buffer.from(data, 'base64')
    return safeStorage.decryptString(buffer)
  } catch {
    return ''
  }
}
