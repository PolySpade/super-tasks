import { Theme } from '../types'
import { BUILT_IN_THEMES } from '../utils/theme'
import { Plus, Pencil, Trash2 } from 'lucide-react'

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

  return (
    <div className="theme-grid">
      {allThemes.map((theme) => (
        <div
          key={theme.id}
          className={`theme-swatch ${activeThemeId === theme.id ? 'theme-swatch-active' : ''}`}
          onClick={() => onThemeChange(theme.id)}
        >
          <div
            className="theme-swatch-preview"
            style={{ background: theme.colors.bgPrimary }}
          >
            <div
              className="theme-swatch-accent"
              style={{ background: theme.colors.accent }}
            />
          </div>
          <div className="theme-swatch-footer">
            <span className="theme-swatch-name">{theme.name}</span>
            {!theme.builtIn && (
              <div className="theme-swatch-actions">
                <button
                  className="theme-swatch-action-btn"
                  onClick={(e) => { e.stopPropagation(); onEditCustom(theme) }}
                  title="Edit"
                >
                  <Pencil size={10} />
                </button>
                <button
                  className="theme-swatch-action-btn"
                  onClick={(e) => { e.stopPropagation(); onDeleteCustom(theme.id) }}
                  title="Delete"
                >
                  <Trash2 size={10} />
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
      <div className="theme-swatch theme-swatch-add" onClick={onCreateCustom}>
        <div className="theme-swatch-preview theme-swatch-preview-add">
          <Plus size={18} />
        </div>
        <div className="theme-swatch-footer">
          <span className="theme-swatch-name">Custom</span>
        </div>
      </div>
    </div>
  )
}
