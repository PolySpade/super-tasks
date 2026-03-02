import { useState, useEffect, useCallback } from 'react'
import { LogOut, Check, X, Loader2 } from 'lucide-react'
import { PlannerSettings, PomodoroConfig } from '../types'
import { NudgeSettings } from './NudgeSettings'

interface SettingsPanelProps {
  onSignOut: () => void
}

type KeyStatus = 'idle' | 'validating' | 'valid' | 'invalid'

export function SettingsPanel({ onSignOut }: SettingsPanelProps) {
  const [startupEnabled, setStartupEnabled] = useState(false)
  const [alwaysOnTop, setAlwaysOnTop] = useState(true)
  const [settings, setSettings] = useState<PlannerSettings>({
    aiProvider: 'anthropic',
    aiApiKey: '',
    workingHoursStart: '09:00',
    workingHoursEnd: '17:00',
    lunchBreakStart: '12:00',
    lunchBreakEnd: '13:00',
    defaultCalendarId: 'primary',
    breakDurationMinutes: 15,
    quickCaptureHotkey: 'Ctrl+Shift+Space',
    quickCaptureDefaultListId: ''
  })
  const [taskLists, setTaskLists] = useState<{ id: string; title: string }[]>([])
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [keyStatus, setKeyStatus] = useState<KeyStatus>('idle')
  const [keyError, setKeyError] = useState('')
  const [calendars, setCalendars] = useState<{ id: string; summary: string; primary: boolean }[]>([])
  const [pomodoro, setPomodoro] = useState<PomodoroConfig>({
    workMinutes: 25,
    breakMinutes: 5,
    longBreakMinutes: 15,
    sessionsBeforeLongBreak: 4,
    logToCalendar: false
  })
  const [persona, setPersona] = useState({ name: '', role: '', workStyle: '', preferences: '' })

  useEffect(() => {
    window.api.getStartupEnabled().then((result) => {
      setStartupEnabled(result.enabled)
    })
    window.api.getAlwaysOnTop().then((result) => {
      setAlwaysOnTop(result.enabled)
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
    window.api.getTaskLists().then((result) => {
      if (result.success && result.data) {
        setTaskLists(result.data)
      }
    })
    window.api.getPomodoroSettings().then((result) => {
      if (result.success && result.data) {
        setPomodoro(result.data)
      }
    })
    window.api.getPersona().then((result) => {
      if (result.success && result.data) {
        setPersona(result.data)
      }
    })
  }, [])

  const savePomodoroSetting = async (updates: Partial<PomodoroConfig>) => {
    const result = await window.api.setPomodoroSettings(updates)
    if (result.success && result.data) {
      setPomodoro(result.data)
    }
  }

  const handleStartupToggle = async () => {
    const newValue = !startupEnabled
    setStartupEnabled(newValue)
    await window.api.setStartupEnabled(newValue)
  }

  const handleAlwaysOnTopToggle = async () => {
    const newValue = !alwaysOnTop
    setAlwaysOnTop(newValue)
    await window.api.setAlwaysOnTop(newValue)
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

  const [capturingHotkey, setCapturingHotkey] = useState(false)

  const handleHotkeyKeyDown = useCallback((e: React.KeyboardEvent) => {
    e.preventDefault()
    e.stopPropagation()

    // Ignore standalone modifier presses
    const ignoredKeys = ['Control', 'Shift', 'Alt', 'Meta']
    if (ignoredKeys.includes(e.key)) return

    const parts: string[] = []
    if (e.ctrlKey) parts.push('Ctrl')
    if (e.altKey) parts.push('Alt')
    if (e.shiftKey) parts.push('Shift')
    if (e.metaKey) parts.push('Super')

    // Must have at least one modifier
    if (parts.length === 0) return

    // Map key to Electron accelerator name
    let key = e.key
    if (key === ' ') key = 'Space'
    else if (key.length === 1) key = key.toUpperCase()
    else if (key === 'ArrowUp') key = 'Up'
    else if (key === 'ArrowDown') key = 'Down'
    else if (key === 'ArrowLeft') key = 'Left'
    else if (key === 'ArrowRight') key = 'Right'
    else if (key === 'Escape') { setCapturingHotkey(false); return }

    parts.push(key)
    const accelerator = parts.join('+')

    setSettings((prev) => ({ ...prev, quickCaptureHotkey: accelerator }))
    saveSetting({ quickCaptureHotkey: accelerator })
    setCapturingHotkey(false)
    ;(e.target as HTMLElement).blur()
  }, [])

  const savePersonaField = (field: string, value: string) => {
    window.api.setPersona({ [field]: value })
  }

  return (
    <div className="settings-panel">
      {/* Persona */}
      <div className="settings-section-label">Persona</div>

      <div className="settings-item settings-item-col">
        <span>Name</span>
        <input
          type="text"
          className="settings-input"
          placeholder="e.g. Donald"
          value={persona.name}
          onChange={(e) => setPersona((p) => ({ ...p, name: e.target.value }))}
          onBlur={() => savePersonaField('name', persona.name)}
        />
      </div>

      <div className="settings-item settings-item-col">
        <span>Role</span>
        <input
          type="text"
          className="settings-input"
          placeholder="e.g. Software Engineer, Student"
          value={persona.role}
          onChange={(e) => setPersona((p) => ({ ...p, role: e.target.value }))}
          onBlur={() => savePersonaField('role', persona.role)}
        />
      </div>

      <div className="settings-item settings-item-col">
        <span>Work Style</span>
        <textarea
          className="settings-input"
          placeholder="e.g. I prefer deep focus blocks in the morning"
          rows={2}
          value={persona.workStyle}
          onChange={(e) => setPersona((p) => ({ ...p, workStyle: e.target.value }))}
          onBlur={() => savePersonaField('workStyle', persona.workStyle)}
        />
      </div>

      <div className="settings-item settings-item-col">
        <span>Preferences</span>
        <textarea
          className="settings-input"
          placeholder="e.g. I like short tasks first, No meetings before 10am"
          rows={2}
          value={persona.preferences}
          onChange={(e) => setPersona((p) => ({ ...p, preferences: e.target.value }))}
          onBlur={() => savePersonaField('preferences', persona.preferences)}
        />
      </div>

      <div className="settings-divider" />

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
        <span>Lunch break</span>
        <div className="settings-hours-row">
          <input
            type="time"
            className="settings-time-input"
            value={settings.lunchBreakStart}
            onChange={(e) => {
              setSettings((prev) => ({ ...prev, lunchBreakStart: e.target.value }))
              saveSetting({ lunchBreakStart: e.target.value })
            }}
          />
          <span className="settings-hours-sep">-</span>
          <input
            type="time"
            className="settings-time-input"
            value={settings.lunchBreakEnd}
            onChange={(e) => {
              setSettings((prev) => ({ ...prev, lunchBreakEnd: e.target.value }))
              saveSetting({ lunchBreakEnd: e.target.value })
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

      {/* Focus Mode */}
      <div className="settings-section-label">Focus Mode</div>

      <div className="settings-item">
        <span>Work duration</span>
        <select
          className="settings-select"
          value={pomodoro.workMinutes}
          onChange={(e) => {
            const val = Number(e.target.value)
            setPomodoro((prev) => ({ ...prev, workMinutes: val }))
            savePomodoroSetting({ workMinutes: val })
          }}
        >
          <option value={15}>15 min</option>
          <option value={25}>25 min</option>
          <option value={30}>30 min</option>
          <option value={45}>45 min</option>
          <option value={60}>60 min</option>
        </select>
      </div>

      <div className="settings-item">
        <span>Break duration</span>
        <select
          className="settings-select"
          value={pomodoro.breakMinutes}
          onChange={(e) => {
            const val = Number(e.target.value)
            setPomodoro((prev) => ({ ...prev, breakMinutes: val }))
            savePomodoroSetting({ breakMinutes: val })
          }}
        >
          <option value={3}>3 min</option>
          <option value={5}>5 min</option>
          <option value={10}>10 min</option>
          <option value={15}>15 min</option>
        </select>
      </div>

      <div className="settings-item">
        <span>Long break</span>
        <select
          className="settings-select"
          value={pomodoro.longBreakMinutes}
          onChange={(e) => {
            const val = Number(e.target.value)
            setPomodoro((prev) => ({ ...prev, longBreakMinutes: val }))
            savePomodoroSetting({ longBreakMinutes: val })
          }}
        >
          <option value={10}>10 min</option>
          <option value={15}>15 min</option>
          <option value={20}>20 min</option>
          <option value={30}>30 min</option>
        </select>
      </div>

      <div className="settings-item">
        <span>Sessions before long break</span>
        <select
          className="settings-select"
          value={pomodoro.sessionsBeforeLongBreak}
          onChange={(e) => {
            const val = Number(e.target.value)
            setPomodoro((prev) => ({ ...prev, sessionsBeforeLongBreak: val }))
            savePomodoroSetting({ sessionsBeforeLongBreak: val })
          }}
        >
          <option value={2}>2</option>
          <option value={3}>3</option>
          <option value={4}>4</option>
          <option value={6}>6</option>
        </select>
      </div>

      <div className="settings-item">
        <span>Log to calendar</span>
        <label className="toggle">
          <input
            type="checkbox"
            checked={pomodoro.logToCalendar}
            onChange={() => {
              const val = !pomodoro.logToCalendar
              setPomodoro((prev) => ({ ...prev, logToCalendar: val }))
              savePomodoroSetting({ logToCalendar: val })
            }}
          />
          <span className="toggle-slider" />
        </label>
      </div>

      <div className="settings-divider" />

      {/* Nudges */}
      <div className="settings-section-label">Nudges & Reminders</div>
      <NudgeSettings />

      <div className="settings-divider" />

      {/* Quick Capture */}
      <div className="settings-section-label">Quick Capture</div>

      <div className="settings-item">
        <span>Hotkey</span>
        <input
          type="text"
          className="settings-input"
          style={{ width: 160, cursor: 'pointer', caretColor: 'transparent' }}
          readOnly
          value={capturingHotkey ? 'Press shortcut...' : settings.quickCaptureHotkey}
          onFocus={() => setCapturingHotkey(true)}
          onBlur={() => setCapturingHotkey(false)}
          onKeyDown={handleHotkeyKeyDown}
        />
      </div>

      {taskLists.length > 0 && (
        <div className="settings-item">
          <span>Default list</span>
          <select
            className="settings-select"
            value={settings.quickCaptureDefaultListId}
            onChange={(e) => {
              setSettings((prev) => ({ ...prev, quickCaptureDefaultListId: e.target.value }))
              saveSetting({ quickCaptureDefaultListId: e.target.value })
            }}
          >
            <option value="">First available</option>
            {taskLists.map((list) => (
              <option key={list.id} value={list.id}>
                {list.title}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="settings-divider" />

      {/* General */}
      <div className="settings-section-label">General</div>

      <div className="settings-item">
        <span>Always on top</span>
        <label className="toggle">
          <input
            type="checkbox"
            checked={alwaysOnTop}
            onChange={handleAlwaysOnTopToggle}
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
