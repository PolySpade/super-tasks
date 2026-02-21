import { useState, useEffect } from 'react'
import { LogOut, Check, X, Loader2 } from 'lucide-react'
import { PlannerSettings } from '../types'

interface SettingsPanelProps {
  onSignOut: () => void
}

type KeyStatus = 'idle' | 'validating' | 'valid' | 'invalid'

export function SettingsPanel({ onSignOut }: SettingsPanelProps) {
  const [startupEnabled, setStartupEnabled] = useState(false)
  const [settings, setSettings] = useState<PlannerSettings>({
    aiProvider: 'anthropic',
    aiApiKey: '',
    workingHoursStart: '09:00',
    workingHoursEnd: '17:00',
    defaultCalendarId: 'primary',
    breakDurationMinutes: 15
  })
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [keyStatus, setKeyStatus] = useState<KeyStatus>('idle')
  const [keyError, setKeyError] = useState('')
  const [calendars, setCalendars] = useState<{ id: string; summary: string; primary: boolean }[]>([])

  useEffect(() => {
    window.api.getStartupEnabled().then((result) => {
      setStartupEnabled(result.enabled)
    })
    window.api.getPlannerSettings().then((result) => {
      if (result.success && result.data) {
        setSettings(result.data)
      }
    })
    window.api.getCalendars().then((result) => {
      if (result.success && result.data) {
        setCalendars(result.data)
      }
    })
  }, [])

  const handleStartupToggle = async () => {
    const newValue = !startupEnabled
    setStartupEnabled(newValue)
    await window.api.setStartupEnabled(newValue)
  }

  const handleProviderChange = async (provider: PlannerSettings['aiProvider']) => {
    setSettings((prev) => ({ ...prev, aiProvider: provider }))
    // Reset key status when switching providers
    setKeyStatus('idle')
    setKeyError('')
    await window.api.setPlannerSettings({ aiProvider: provider })
  }

  const saveSetting = async (updates: Partial<PlannerSettings>) => {
    const result = await window.api.setPlannerSettings(updates)
    if (result.success && result.data) {
      setSettings(result.data)
    }
  }

  const handleApiKeySave = async () => {
    if (!apiKeyInput) return

    setKeyStatus('validating')
    setKeyError('')

    // Validate the key first
    const validateResult = await window.api.validateApiKey(settings.aiProvider, apiKeyInput)

    if (validateResult.success) {
      // Key is valid — save it
      const saveResult = await window.api.setPlannerSettings({ aiApiKey: apiKeyInput })
      if (saveResult.success && saveResult.data) {
        setSettings(saveResult.data)
      }
      setApiKeyInput('')
      setKeyStatus('valid')
      setTimeout(() => setKeyStatus('idle'), 3000)
    } else {
      setKeyStatus('invalid')
      setKeyError(validateResult.error || 'Invalid API key')
    }
  }

  return (
    <div className="settings-panel">
      {/* AI Configuration */}
      <div className="settings-section-label">AI Planner</div>

      <div className="settings-item">
        <span>Provider</span>
        <div className="settings-toggle-group">
          <button
            className={`settings-toggle-btn ${settings.aiProvider === 'anthropic' ? 'active' : ''}`}
            onClick={() => handleProviderChange('anthropic')}
          >
            Claude
          </button>
          <button
            className={`settings-toggle-btn ${settings.aiProvider === 'openai' ? 'active' : ''}`}
            onClick={() => handleProviderChange('openai')}
          >
            OpenAI
          </button>
          <button
            className={`settings-toggle-btn ${settings.aiProvider === 'gemini' ? 'active' : ''}`}
            onClick={() => handleProviderChange('gemini')}
          >
            Gemini
          </button>
        </div>
      </div>

      <div className="settings-item settings-item-col">
        <span>API Key {settings.aiApiKey ? '(configured)' : ''}</span>
        <div className="settings-key-row">
          <input
            type="password"
            className="settings-input"
            placeholder={settings.aiApiKey ? '••••••••' : `Enter ${settings.aiProvider} API key`}
            value={apiKeyInput}
            onChange={(e) => {
              setApiKeyInput(e.target.value)
              if (keyStatus !== 'idle' && keyStatus !== 'validating') {
                setKeyStatus('idle')
                setKeyError('')
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && apiKeyInput) handleApiKeySave()
            }}
          />
          <button
            className="settings-key-save"
            onClick={handleApiKeySave}
            disabled={!apiKeyInput || keyStatus === 'validating'}
          >
            {keyStatus === 'validating' ? (
              <Loader2 size={14} className="spin" />
            ) : (
              'Save'
            )}
          </button>
        </div>
        {keyStatus === 'valid' && (
          <div className="settings-key-status settings-key-valid">
            <Check size={12} />
            API key verified and saved
          </div>
        )}
        {keyStatus === 'invalid' && (
          <div className="settings-key-status settings-key-invalid">
            <X size={12} />
            {keyError}
          </div>
        )}
      </div>

      <div className="settings-item">
        <span>Working hours</span>
        <div className="settings-hours-row">
          <input
            type="time"
            className="settings-time-input"
            value={settings.workingHoursStart}
            onChange={(e) => {
              setSettings((prev) => ({ ...prev, workingHoursStart: e.target.value }))
              saveSetting({ workingHoursStart: e.target.value })
            }}
          />
          <span className="settings-hours-sep">-</span>
          <input
            type="time"
            className="settings-time-input"
            value={settings.workingHoursEnd}
            onChange={(e) => {
              setSettings((prev) => ({ ...prev, workingHoursEnd: e.target.value }))
              saveSetting({ workingHoursEnd: e.target.value })
            }}
          />
        </div>
      </div>

      <div className="settings-item">
        <span>Break duration</span>
        <select
          className="settings-select"
          value={settings.breakDurationMinutes}
          onChange={(e) => {
            const val = Number(e.target.value)
            setSettings((prev) => ({ ...prev, breakDurationMinutes: val }))
            saveSetting({ breakDurationMinutes: val })
          }}
        >
          <option value={5}>5 min</option>
          <option value={10}>10 min</option>
          <option value={15}>15 min</option>
          <option value={30}>30 min</option>
        </select>
      </div>

      {calendars.length > 0 && (
        <div className="settings-item">
          <span>Calendar</span>
          <select
            className="settings-select"
            value={settings.defaultCalendarId}
            onChange={(e) => {
              setSettings((prev) => ({ ...prev, defaultCalendarId: e.target.value }))
              saveSetting({ defaultCalendarId: e.target.value })
            }}
          >
            {calendars.map((cal) => (
              <option key={cal.id} value={cal.id}>
                {cal.summary}{cal.primary ? ' (primary)' : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="settings-divider" />

      {/* General */}
      <div className="settings-section-label">General</div>

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
