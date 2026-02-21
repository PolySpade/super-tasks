import { Calendar, Check, X, Clock } from 'lucide-react'
import { GeneratedSubtask } from '../types'

interface WorkBackwardsViewProps {
  schedule: { subtaskTitle: string; date: string; start: string; end: string }[]
  subtasks: GeneratedSubtask[]
  onConfirm: () => void
  onCancel: () => void
  confirming: boolean
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function formatTime(timeStr: string): string {
  // Handle both "HH:MM" and ISO strings
  if (timeStr.includes('T')) {
    const d = new Date(timeStr)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
  }
  return timeStr
}

export function WorkBackwardsView({
  schedule,
  subtasks,
  onConfirm,
  onCancel,
  confirming
}: WorkBackwardsViewProps) {
  return (
    <div className="work-backwards-view">
      <div className="work-backwards-header">
        <Calendar size={14} />
        <span>Work Backwards Schedule</span>
      </div>

      {subtasks.length > 0 && (
        <div className="work-backwards-section">
          <div className="work-backwards-section-label">Subtasks</div>
          {subtasks.map((st, i) => (
            <div key={i} className="work-backwards-subtask">
              <span className="work-backwards-subtask-title">{st.title}</span>
              <span className="work-backwards-subtask-est">
                <Clock size={10} />
                {st.estimatedMinutes}m
              </span>
            </div>
          ))}
        </div>
      )}

      {schedule.length > 0 && (
        <div className="work-backwards-section">
          <div className="work-backwards-section-label">Proposed Schedule</div>
          {schedule.map((item, i) => (
            <div key={i} className="work-backwards-slot">
              <div className="work-backwards-slot-bar" />
              <div className="work-backwards-slot-content">
                <span className="work-backwards-slot-title">{item.subtaskTitle}</span>
                <span className="work-backwards-slot-time">
                  {formatDate(item.date)} &middot; {formatTime(item.start)} - {formatTime(item.end)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="work-backwards-actions">
        <button
          className="work-backwards-cancel"
          onClick={onCancel}
          disabled={confirming}
        >
          <X size={14} />
          Cancel
        </button>
        <button
          className="work-backwards-confirm"
          onClick={onConfirm}
          disabled={confirming}
        >
          <Check size={14} />
          {confirming ? 'Creating...' : 'Confirm & Schedule'}
        </button>
      </div>
    </div>
  )
}
