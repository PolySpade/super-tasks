import { useState } from 'react'

interface PersonaSetupModalProps {
  onComplete: () => void
  onSkip: () => void
}

export function PersonaSetupModal({ onComplete, onSkip }: PersonaSetupModalProps) {
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [workStyle, setWorkStyle] = useState('')
  const [preferences, setPreferences] = useState('')
  const [saving, setSaving] = useState(false)

  const canSubmit = name.trim() !== '' && role.trim() !== ''

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSaving(true)
    await window.api.setPersona({ name: name.trim(), role: role.trim(), workStyle: workStyle.trim(), preferences: preferences.trim() })
    setSaving(false)
    onComplete()
  }

  return (
    <div className="persona-setup-overlay">
      <div className="persona-setup-modal">
        <h2 className="persona-setup-title">Tell us about yourself</h2>
        <p className="persona-setup-subtitle">
          This helps the AI plan your day and rename tasks in your style
        </p>

        <div className="persona-setup-fields">
          <div className="persona-field">
            <label className="persona-label">
              Name <span className="persona-required">*</span>
            </label>
            <input
              type="text"
              className="settings-input"
              placeholder="e.g. Donald"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="persona-field">
            <label className="persona-label">
              Role <span className="persona-required">*</span>
            </label>
            <input
              type="text"
              className="settings-input"
              placeholder="e.g. Software Engineer, Student, Freelancer"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            />
          </div>

          <div className="persona-field">
            <label className="persona-label">Work Style</label>
            <textarea
              className="settings-input"
              placeholder="e.g. I prefer deep focus blocks in the morning"
              rows={2}
              value={workStyle}
              onChange={(e) => setWorkStyle(e.target.value)}
            />
          </div>

          <div className="persona-field">
            <label className="persona-label">Preferences</label>
            <textarea
              className="settings-input"
              placeholder="e.g. I like short tasks first, No meetings before 10am"
              rows={2}
              value={preferences}
              onChange={(e) => setPreferences(e.target.value)}
            />
          </div>
        </div>

        <button
          className="persona-submit-btn"
          disabled={!canSubmit || saving}
          onClick={handleSubmit}
        >
          {saving ? 'Saving...' : 'Get started'}
        </button>

        <button className="persona-skip-btn" onClick={onSkip}>
          Skip for now
        </button>
      </div>
    </div>
  )
}
