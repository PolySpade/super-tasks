import { Settings, X, ArrowLeft } from 'lucide-react'

interface TitleBarProps {
  onSettingsClick: () => void
  onClose: () => void
  showBack?: boolean
  onBack?: () => void
  title?: string
}

export function TitleBar({ onSettingsClick, onClose, showBack, onBack, title }: TitleBarProps) {
  return (
    <div className="title-bar">
      <div className="title-bar-drag">
        {showBack && onBack ? (
          <button className="title-bar-btn" onClick={onBack} title="Back">
            <ArrowLeft size={14} />
          </button>
        ) : null}
        <span className="title-bar-title">{title || 'Google Tasks'}</span>
      </div>
      <div className="title-bar-actions">
        <button className="title-bar-btn" onClick={onSettingsClick} title="Settings">
          <Settings size={14} />
        </button>
        <button className="title-bar-btn close-btn" onClick={onClose} title="Close">
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
