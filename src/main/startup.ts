import { app } from 'electron'

export function getStartupEnabled(): boolean {
  const settings = app.getLoginItemSettings()
  return settings.openAtLogin
}

export function setStartupEnabled(enabled: boolean): void {
  app.setLoginItemSettings({
    openAtLogin: enabled,
    args: enabled ? ['--hidden'] : []
  })
}
