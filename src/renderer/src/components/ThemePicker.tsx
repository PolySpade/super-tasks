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

  return (
    <div className="theme-picker">
      {allThemes.map((theme) => {
        const isActive = activeThemeId === theme.id
        return (
          <div
            key={theme.id}
            className={`theme-row ${isActive ? 'theme-row-active' : ''}`}
            onClick={() => onThemeChange(theme.id)}
          >
            <div className="theme-row-left">
              <div
                className="theme-dot"
                style={{ background: theme.colors.bgPrimary, borderColor: theme.colors.accent }}
              >
                <div className="theme-dot-inner" style={{ background: theme.colors.accent }} />
              </div>
              <span className="theme-row-name">{theme.name}</span>
            </div>
            <div className="theme-row-right">
              {!theme.builtIn && (
                <>
                  <button
                    className="theme-row-action"
                    onClick={(e) => { e.stopPropagation(); onEditCustom(theme) }}
                    title="Edit"
                  >
                    <Pencil size={11} />
                  </button>
                  <button
                    className="theme-row-action theme-row-action-danger"
                    onClick={(e) => { e.stopPropagation(); onDeleteCustom(theme.id) }}
                    title="Delete"
                  >
                    <Trash2 size={11} />
                  </button>
                </>
              )}
              {isActive && <Check size={14} className="theme-row-check" />}
            </div>
          </div>
        )
      })}
      <div className="theme-row theme-row-add" onClick={onCreateCustom}>
        <div className="theme-row-left">
          <div className="theme-dot theme-dot-add">
            <Plus size={10} />
          </div>
          <span className="theme-row-name">New theme</span>
        </div>
      </div>
    </div>
  )
}
