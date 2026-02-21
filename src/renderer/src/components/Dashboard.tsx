import { useState } from 'react'
import { Calendar, Sparkles, Plus, Wand2 } from 'lucide-react'
import { Task, TaskList } from '../types'
import { useDashboardData } from '../hooks/useDashboardData'
import { useDeadlines } from '../hooks/useDeadlines'
import { DashboardStats } from './DashboardStats'
import { WeeklyChart } from './WeeklyChart'
import { RecentActivity } from './RecentActivity'
import { DeadlinePreview } from './DeadlinePreview'
import { QuickAddModal } from './QuickAddModal'
import { AIRenameModal } from './AIRenameModal'

interface DashboardProps {
  signedIn: boolean
  taskLists: TaskList[]
  onNavigateToPlan: () => void
  onNavigateToDeadlines: () => void
  onSelectTask: (task: Task) => void
}

export function Dashboard({
  signedIn,
  taskLists,
  onNavigateToPlan,
  onNavigateToDeadlines,
  onSelectTask
}: DashboardProps) {
  const { stats, recentCompleted, weeklyByList, loading, refresh } = useDashboardData(
    signedIn,
    taskLists
  )
  const {
    deadlines,
    loading: deadlinesLoading
  } = useDeadlines(signedIn, taskLists)

  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [showRename, setShowRename] = useState(false)

  const today = new Date()
  const dateStr = today.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  })

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="dashboard-date">
          <Calendar size={14} />
          <span>{dateStr}</span>
        </div>
        <div className="dashboard-actions">
          <button className="dashboard-action-btn" onClick={() => setShowQuickAdd(true)}>
            <Plus size={14} />
            Quick add
          </button>
          <button className="dashboard-action-btn" onClick={() => setShowRename(true)}>
            <Wand2 size={14} />
            AI Rename
          </button>
          <button className="dashboard-action-btn dashboard-action-btn-primary" onClick={onNavigateToPlan}>
            <Sparkles size={14} />
            Plan my day
          </button>
        </div>
      </div>

      {loading ? (
        <div className="plan-generating">
          <div className="spinner" />
          <span>Loading dashboard...</span>
        </div>
      ) : (
        <div className="dashboard-content">
          <DashboardStats
            dueToday={stats.dueToday}
            overdue={stats.overdue}
            completed={stats.completedToday}
            upcomingEvents={deadlines.filter((d) => d.source === 'event').length}
          />

          <WeeklyChart data={weeklyByList} />

          <DeadlinePreview
            deadlines={deadlines}
            loading={deadlinesLoading}
            onSeeAll={onNavigateToDeadlines}
          />

          <RecentActivity tasks={recentCompleted} onSelectTask={onSelectTask} />
        </div>
      )}

      {showQuickAdd && (
        <QuickAddModal
          taskLists={taskLists}
          onClose={() => setShowQuickAdd(false)}
          onCreated={refresh}
        />
      )}

      {showRename && (
        <AIRenameModal
          taskLists={taskLists}
          onClose={() => setShowRename(false)}
          onApplied={refresh}
        />
      )}
    </div>
  )
}
