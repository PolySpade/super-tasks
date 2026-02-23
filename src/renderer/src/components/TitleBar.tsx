import { Settings, X, ArrowLeft } from 'lucide-react'

interface TitleBarProps {
  onSettingsClick: () => void
  onClose: () => void
  showBack?: boolean
  onBack?: () => void
  title?: string
  isOffline?: boolean
}

export function TitleBar({ onSettingsClick, onClose, showBack, onBack, title, isOffline }: TitleBarProps) {
  return (
    <div className="title-bar">
      <div className="title-bar-drag">
        {showBack && onBack ? (
          <button className="title-bar-btn" onClick={onBack} title="Back">
            <ArrowLeft size={14} />
          </button>
        ) : null}
        <span className="title-bar-title">{title || 'SuperTasks'}</span>
      </div>
      <div className="title-bar-actions">
        <span
          className="status-dot"
          title={isOffline ? 'Offline' : 'Online'}
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: isOffline ? '#f44336' : '#4caf50',
            display: 'inline-block',
            marginRight: 10,
            marginTop:11,
            flexShrink: 0
          }}
        />
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
