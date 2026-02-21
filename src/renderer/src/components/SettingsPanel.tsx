import { useState, useEffect } from 'react'
import { LogOut } from 'lucide-react'

interface SettingsPanelProps {
  onSignOut: () => void
}

export function SettingsPanel({ onSignOut }: SettingsPanelProps) {
  const [startupEnabled, setStartupEnabled] = useState(false)

  useEffect(() => {
    window.api.getStartupEnabled().then((result) => {
      setStartupEnabled(result.enabled)
    })
  }, [])

  const handleStartupToggle = async () => {
    const newValue = !startupEnabled
    setStartupEnabled(newValue)
    await window.api.setStartupEnabled(newValue)
  }

  return (
    <div className="settings-panel">
      <div className="settings-item">
        <span>Launch at startup</span>
        <label className="toggle">
          <input
            type="checkbox"
            checked={startupEnabled}
            onChange={handleStartupToggle}
          />
          <span className="toggle-slider" />
        </label>
      </div>
      <div className="settings-divider" />
      <button className="sign-out-btn" onClick={onSignOut}>
        <LogOut size={14} />
        Sign out
      </button>
    </div>
  )
}
