import { CheckCircle } from 'lucide-react'
import { Task } from '../types'

interface RecentActivityProps {
  tasks: Task[]
  onSelectTask: (task: Task) => void
}

function relativeTime(dateStr: string): string {
  const now = new Date()
  const then = new Date(dateStr)
  const diffMs = now.getTime() - then.getTime()
  const diffMin = Math.floor(diffMs / (1000 * 60))
  const diffHr = Math.floor(diffMs / (1000 * 60 * 60))

  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  return 'today'
}

export function RecentActivity({ tasks, onSelectTask }: RecentActivityProps) {
  if (tasks.length === 0) {
    return (
      <div className="recent-activity">
        <div className="recent-activity-label">Recent Activity</div>
        <div className="recent-activity-empty">No completed tasks today</div>
      </div>
    )
  }

  return (
    <div className="recent-activity">
      <div className="recent-activity-label">Recent Activity</div>
      <div className="recent-activity-list">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="recent-activity-row"
            onClick={() => onSelectTask(task)}
          >
            <CheckCircle size={14} className="recent-activity-icon" />
            <span className="recent-activity-title">{task.title}</span>
            {task.completed && (
              <span className="recent-activity-time">{relativeTime(task.completed)}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
