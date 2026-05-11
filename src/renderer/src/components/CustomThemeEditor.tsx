import { useState, useEffect } from 'react'
import { Theme } from '../types'
import { BUILT_IN_THEMES, applyTheme, deriveFullTheme } from '../utils/theme'

interface CustomThemeEditorProps {
  theme: Theme | null
  onSave: (theme: Theme) => void
  onCancel: () => void
  onDelete?: (themeId: string) => void
}

interface KeyColors {
  background: string
  text: string
  accent: string
  surface: string
  border: string
  success: string
  danger: string
  warning: string
}

function extractKeyColors(theme: Theme): KeyColors {
  return {
    background: theme.colors.bgPrimary,
    text: theme.colors.textPrimary,
    accent: theme.colors.accent,
    surface: theme.colors.bgSurface.startsWith('rgba') ? theme.colors.bgPrimary : theme.colors.bgSurface,
    border: theme.colors.border.startsWith('rgba') ? '#333333' : theme.colors.border,
    success: theme.colors.success,
    danger: theme.colors.danger,
    warning: theme.colors.warning
  }
}

const COLOR_LABELS: { key: keyof KeyColors; label: string }[] = [
  { key: 'background', label: 'Background' },
  { key: 'text', label: 'Text' },
  { key: 'accent', label: 'Accent' },
  { key: 'surface', label: 'Surface' },
  { key: 'border', label: 'Border' },
  { key: 'success', label: 'Success' },
  { key: 'danger', label: 'Danger' },
  { key: 'warning', label: 'Warning' }
]

export function CustomThemeEditor({ theme, onSave, onCancel, onDelete }: CustomThemeEditorProps) {
  const isEditing = theme !== null
  const baseTheme = theme || BUILT_IN_THEMES[0]

  const [name, setName] = useState(isEditing ? baseTheme.name : '')
  const [keyColors, setKeyColors] = useState<KeyColors>(extractKeyColors(baseTheme))
  const [baseFromId, setBaseFromId] = useState(isEditing ? '' : 'midnight')

  useEffect(() => {
    const derived = deriveFullTheme(keyColors)
    applyTheme(derived)
  }, [keyColors])

  const handleBaseChange = (id: string) => {
    setBaseFromId(id)
    const base = BUILT_IN_THEMES.find((t) => t.id === id)
    if (base) {
      setKeyColors(extractKeyColors(base))
    }
  }

  const handleColorChange = (key: keyof KeyColors, value: string) => {
    setKeyColors((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = () => {
    const trimmedName = name.trim()
    if (!trimmedName) return
    const id = isEditing ? baseTheme.id : `custom-${Date.now()}`
    const colors = deriveFullTheme(keyColors)
    onSave({ id, name: trimmedName, builtIn: false, colors })
  }

  return (
    <div className="custom-theme-editor-overlay" onClick={onCancel}>
      <div className="custom-theme-editor" onClick={(e) => e.stopPropagation()}>
        <div className="custom-theme-editor-header">
          <span>{isEditing ? 'Edit Theme' : 'New Custom Theme'}</span>
        </div>

        <div className="custom-theme-editor-body">
          <div className="custom-theme-editor-field">
            <label>Name</label>
            <input
              type="text"
              className="settings-input"
              placeholder="My Theme"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {!isEditing && (
            <div className="custom-theme-editor-field">
              <label>Base from</label>
              <select
                className="settings-select"
                value={baseFromId}
                onChange={(e) => handleBaseChange(e.target.value)}
              >
                {BUILT_IN_THEMES.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="custom-theme-editor-colors">
            {COLOR_LABELS.map(({ key, label }) => (
              <div key={key} className="custom-theme-editor-color-row">
                <label>{label}</label>
                <div className="custom-theme-editor-color-input">
                  <input
                    type="color"
                    value={keyColors[key]}
                    onChange={(e) => handleColorChange(key, e.target.value)}
                  />
                  <span className="custom-theme-editor-color-hex">{keyColors[key]}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="custom-theme-editor-footer">
          {isEditing && onDelete && (
            <button
              className="custom-theme-editor-btn custom-theme-editor-btn-danger"
              onClick={() => onDelete(baseTheme.id)}
            >
              Delete
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button className="custom-theme-editor-btn" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="custom-theme-editor-btn custom-theme-editor-btn-primary"
            onClick={handleSave}
            disabled={!name.trim()}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
