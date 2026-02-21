import { ChevronDown, ChevronRight, Sparkles, Rewind, Calendar } from 'lucide-react'
import { Deadline } from '../types'

interface DeadlineItemProps {
  deadline: Deadline
  expanded: boolean
  onToggleExpand: () => void
  onGenerateSubtasks: (deadline: Deadline) => void
  onWorkBackwards: (deadline: Deadline) => void
  generating: boolean
}

const urgencyColors: Record<Deadline['urgency'], string> = {
  overdue: 'var(--danger)',
  red: 'var(--danger)',
  yellow: 'var(--warning)',
  green: 'var(--success)'
}

function formatCountdown(deadline: Deadline): { value: string; label: string } {
  if (deadline.urgency === 'overdue') {
    return { value: String(Math.abs(deadline.daysRemaining)), label: 'OVERDUE' }
  }
  if (deadline.hoursRemaining !== undefined && deadline.daysRemaining <= 1) {
    return { value: String(deadline.hoursRemaining), label: 'hours' }
  }
  return { value: String(deadline.daysRemaining), label: 'days' }
}

function formatDueDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export function DeadlineItem({
  deadline,
  expanded,
  onToggleExpand,
  onGenerateSubtasks,
  onWorkBackwards,
  generating
}: DeadlineItemProps) {
  const countdown = formatCountdown(deadline)
  const isOverdue = deadline.urgency === 'overdue'

  return (
    <div className={`deadline-item ${isOverdue ? 'deadline-item-overdue' : ''}`}>
      <div
        className="deadline-item-row"
        onClick={onToggleExpand}
        style={{ borderLeftColor: urgencyColors[deadline.urgency] }}
      >
        <div className="deadline-item-expand">
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </div>
        <div className="deadline-item-content">
          <span className="deadline-item-title">{deadline.title}</span>
          <span className="deadline-item-meta">
            <Calendar size={10} />
            {formatDueDate(deadline.dueDate)}
            {deadline.source === 'event' && (
              <span className="deadline-item-source">event</span>
            )}
          </span>
        </div>
        <div
          className="deadline-item-countdown"
          style={{ color: urgencyColors[deadline.urgency] }}
        >
          <span className="deadline-item-countdown-value">{countdown.value}</span>
          <span className="deadline-item-countdown-label">{countdown.label}</span>
        </div>
      </div>

      {expanded && (
        <div className="deadline-item-panel">
          {deadline.hasSubtasks && deadline.children && (
            <div className="deadline-item-subtasks">
              <div className="deadline-item-subtasks-label">Subtasks</div>
              {deadline.children.map((child) => (
                <div key={child.id} className="deadline-item-subtask">
                  <span
                    className={`deadline-item-subtask-status ${child.status === 'completed' ? 'completed' : ''}`}
                  />
                  <span
                    className={`deadline-item-subtask-title ${child.status === 'completed' ? 'completed' : ''}`}
                  >
                    {child.title}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="deadline-item-actions">
            <button
              className="deadline-item-action-btn"
              onClick={(e) => {
                e.stopPropagation()
                onGenerateSubtasks(deadline)
              }}
              disabled={generating}
            >
              <Sparkles size={12} />
              {generating ? 'Generating...' : 'Generate Subtasks'}
            </button>
            <button
              className="deadline-item-action-btn"
              onClick={(e) => {
                e.stopPropagation()
                onWorkBackwards(deadline)
              }}
              disabled={generating}
            >
              <Rewind size={12} />
              Work Backwards
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
