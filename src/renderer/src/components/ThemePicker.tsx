import { Theme } from '../types'
import { BUILT_IN_THEMES } from '../utils/theme'
import { Check, Plus, Pencil, Trash2 } from 'lucide-react'

interface ThemePickerProps {
  activeThemeId: string
  customThemes: Theme[]
  onThemeChange: (themeId: string) => void
  onCreateCustom: () => void
  onEditCustom: (theme: Theme) => void
  onDeleteCustom: (themeId: string) => void
}

export function ThemePicker({
  activeThemeId,
  customThemes,
  onThemeChange,
  onCreateCustom,
  onEditCustom,
  onDeleteCustom
}: ThemePickerProps) {
  const allThemes = [...BUILT_IN_THEMES, ...customThemes]
  const activeTheme = allThemes.find((t) => t.id === activeThemeId)

  return (
    <div className="theme-picker">
      <div className="theme-dots">
        {allThemes.map((theme) => {
          const isActive = activeThemeId === theme.id
          return (
            <button
              key={theme.id}
              className={`theme-dot-btn ${isActive ? 'theme-dot-btn-active' : ''}`}
              onClick={() => onThemeChange(theme.id)}
              title={theme.name}
            >
              <div
                className="theme-dot-fill"
                style={{ background: theme.colors.bgPrimary, borderColor: theme.colors.accent }}
              />
              {isActive && (
                <div className="theme-dot-check" style={{ color: theme.colors.accent }}>
                  <Check size={10} strokeWidth={3} />
                </div>
              )}
            </button>
          )
        })}
        <button
          className="theme-dot-btn theme-dot-btn-add"
          onClick={onCreateCustom}
          title="New theme"
        >
          <Plus size={12} />
        </button>
      </div>
      {activeTheme && (
        <div className="theme-active-label">
          <span>{activeTheme.name}</span>
          {!activeTheme.builtIn && (
            <div className="theme-active-actions">
              <button
                className="theme-active-action"
                onClick={() => onEditCustom(activeTheme)}
                title="Edit"
              >
                <Pencil size={11} />
              </button>
              <button
                className="theme-active-action theme-active-action-danger"
                onClick={() => onDeleteCustom(activeTheme.id)}
                title="Delete"
              >
                <Trash2 size={11} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
