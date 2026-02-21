import { X } from 'lucide-react'

interface TimeBlockProps {
  start: string
  end: string
  title: string
  reason?: string
  type: 'event' | 'task' | 'break'
  onRemove?: () => void
}

export function TimeBlockRow({ start, end, title, reason, type, onRemove }: TimeBlockProps) {
  const typeClass = type === 'event' ? 'time-block-event' : type === 'task' ? 'time-block-task' : 'time-block-break'

  return (
    <div className={`time-block ${typeClass}`}>
      <div className="time-block-bar" />
      <div className="time-block-time">
        {start}–{end}
      </div>
      <div className="time-block-content">
        <div className="time-block-title">{title}</div>
        {reason && <div className="time-block-reason">{reason}</div>}
      </div>
      {onRemove && (
        <button className="time-block-remove icon-btn" onClick={onRemove} title="Remove">
          <X size={14} />
        </button>
      )}
    </div>
  )
}
