import { Clock, ChevronRight } from 'lucide-react'
import { Deadline } from '../types'

interface DeadlinePreviewProps {
  deadlines: Deadline[]
  loading: boolean
  onSeeAll: () => void
}

const urgencyColors: Record<Deadline['urgency'], string> = {
  overdue: 'var(--danger)',
  red: 'var(--danger)',
  yellow: 'var(--warning)',
  green: 'var(--success)'
}

function formatCountdown(deadline: Deadline): string {
  if (deadline.urgency === 'overdue') return 'OVERDUE'
  if (deadline.hoursRemaining !== undefined && deadline.daysRemaining <= 1) {
    return `${deadline.hoursRemaining}h`
  }
  return `${deadline.daysRemaining}d`
}

export function DeadlinePreview({ deadlines, loading, onSeeAll }: DeadlinePreviewProps) {
  const top5 = deadlines.slice(0, 5)

  return (
    <div className="deadline-preview">
      <div className="deadline-preview-header">
        <Clock size={14} className="deadline-preview-icon" />
        <span className="deadline-preview-label">Upcoming Deadlines</span>
        {deadlines.length > 5 && (
          <button className="deadline-preview-see-all" onClick={onSeeAll}>
            See all <ChevronRight size={12} />
          </button>
        )}
      </div>

      {loading ? (
        <div className="deadline-preview-loading">
          <div className="spinner" />
        </div>
      ) : top5.length === 0 ? (
        <div className="deadline-preview-empty">No upcoming deadlines</div>
      ) : (
        <div className="deadline-preview-list">
          {top5.map((d) => (
            <div
              key={d.id}
              className="deadline-preview-item"
              style={{ borderLeftColor: urgencyColors[d.urgency] }}
            >
              <span className="deadline-preview-item-title">{d.title}</span>
              <span
                className="deadline-preview-badge"
                style={{
                  background:
                    d.urgency === 'overdue'
                      ? 'var(--danger-dim)'
                      : d.urgency === 'red'
                        ? 'var(--danger-dim)'
                        : d.urgency === 'yellow'
                          ? 'var(--warning-dim)'
                          : 'var(--success-dim)',
                  color: urgencyColors[d.urgency]
                }}
              >
                {formatCountdown(d)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
