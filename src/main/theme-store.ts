import Store from 'electron-store'

export interface ThemeStoreData {
  activeThemeId: string
  customThemes: { id: string; name: string; builtIn: boolean; colors: Record<string, string> }[]
}

const DEFAULTS: ThemeStoreData = {
  activeThemeId: 'midnight',
  customThemes: []
}

export const store = new Store({ name: 'theme' })

export function getThemeData(): ThemeStoreData {
  const saved = store.get('theme') as Partial<ThemeStoreData> | undefined
  return { ...DEFAULTS, ...saved }
}

export function setActiveTheme(themeId: string): ThemeStoreData {
  const current = getThemeData()
  current.activeThemeId = themeId
  store.set('theme', current)
  return current
}

export function saveCustomTheme(theme: ThemeStoreData['customThemes'][0]): ThemeStoreData {
  const current = getThemeData()
  const idx = current.customThemes.findIndex((t) => t.id === theme.id)
  if (idx >= 0) {
    current.customThemes[idx] = theme
  } else {
    current.customThemes.push(theme)
  }
  store.set('theme', current)
  return current
}

export function deleteCustomTheme(themeId: string): ThemeStoreData {
  const current = getThemeData()
  current.customThemes = current.customThemes.filter((t) => t.id !== themeId)
  if (current.activeThemeId === themeId) {
    current.activeThemeId = 'midnight'
  }
  store.set('theme', current)
  return current
}
