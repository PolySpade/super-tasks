interface DashboardStatsProps {
  dueToday: number
  overdue: number
  completed: number
  upcomingEvents: number
}

export function DashboardStats({ dueToday, overdue, completed, upcomingEvents }: DashboardStatsProps) {
  return (
    <div className="dashboard-stats-grid">
      <div className="dashboard-stat-card" style={{ borderLeftColor: 'var(--accent)' }}>
        <span className="dashboard-stat-number" style={{ color: 'var(--accent)' }}>
          {dueToday}
        </span>
        <span className="dashboard-stat-label">Due Today</span>
      </div>
      <div className="dashboard-stat-card" style={{ borderLeftColor: 'var(--danger)' }}>
        <span className="dashboard-stat-number" style={{ color: 'var(--danger)' }}>
          {overdue}
        </span>
        <span className="dashboard-stat-label">Overdue</span>
      </div>
      <div className="dashboard-stat-card" style={{ borderLeftColor: 'var(--success)' }}>
        <span className="dashboard-stat-number" style={{ color: 'var(--success)' }}>
          {completed}
        </span>
        <span className="dashboard-stat-label">Completed</span>
      </div>
      <div className="dashboard-stat-card" style={{ borderLeftColor: 'var(--warning)' }}>
        <span className="dashboard-stat-number" style={{ color: 'var(--warning)' }}>
          {upcomingEvents}
        </span>
        <span className="dashboard-stat-label">Events</span>
      </div>
    </div>
  )
}
