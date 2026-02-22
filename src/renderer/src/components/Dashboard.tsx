import { useState, useMemo, useEffect } from 'react'
import { Calendar, Sparkles, Plus, Wand2, ClipboardList, Zap, Moon, Sun } from 'lucide-react'
import { Task, TaskList, EnergyLevel, TaskMetadata } from '../types'
import { useDashboardData } from '../hooks/useDashboardData'
import { useDeadlines } from '../hooks/useDeadlines'
import { DashboardStats } from './DashboardStats'
import { WeeklyChart } from './WeeklyChart'
import { RecentActivity } from './RecentActivity'
import { DeadlinePreview } from './DeadlinePreview'
import { QuickAddModal } from './QuickAddModal'
import { AIRenameModal } from './AIRenameModal'
import { MITSection } from './MITSection'
import { EnergyBadge } from './EnergyBadge'
import { HabitSection } from './HabitSection'

interface DashboardProps {
  signedIn: boolean
  taskLists: TaskList[]
  onNavigateToPlan: () => void
  onNavigateToDeadlines: () => void
  onNavigateToWeeklyReview: () => void
  onSelectTask: (task: Task) => void
  mits: string[]
  onSetMITs: (taskIds: string[]) => void
  allTasks: Task[]
  metadataMap: Record<string, TaskMetadata>
  onStartRitual?: () => void
}

function flattenTasks(tasks: Task[]): Task[] {
  const flat: Task[] = []
  for (const t of tasks) {
    flat.push(t)
    if (t.children) flat.push(...flattenTasks(t.children))
  }
  return flat
}

export function Dashboard({
  signedIn,
  taskLists,
  onNavigateToPlan,
  onNavigateToDeadlines,
  onNavigateToWeeklyReview,
  onSelectTask,
  mits,
  onSetMITs,
  allTasks,
  metadataMap,
  onStartRitual
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
  const [recentMoods, setRecentMoods] = useState<{ date: string; rating: number }[]>([])

  useEffect(() => {
    window.api.eodGetRecent(5).then((result) => {
      if (result?.data) {
        setRecentMoods(result.data.map((r: any) => ({ date: r.date, rating: r.rating })))
      }
    })
  }, [])

  const today = new Date()
  const dateStr = today.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  })

  // Suggested task based on energy and time of day
  const suggestedTask = useMemo(() => {
    const hour = new Date().getHours()
    const isAfternoon = hour >= 13
    const targetEnergy: EnergyLevel = isAfternoon ? 'low' : 'high'
    const flat = flattenTasks(allTasks).filter((t) => t.status === 'needsAction')

    // Try energy-matched task
    const energyMatch = flat.find((t) => metadataMap[t.id]?.energyLevel === targetEnergy)
    if (energyMatch) return { task: energyMatch, reason: isAfternoon ? 'Low energy — ease into the afternoon' : 'High energy — tackle this while fresh' }

    // Fallback: first MIT
    if (mits.length > 0) {
      const mitTask = flat.find((t) => t.id === mits[0])
      if (mitTask) return { task: mitTask, reason: 'Your top priority for today' }
    }

    return null
  }, [allTasks, metadataMap, mits])

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="dashboard-date">
          <Calendar size={14} />
          <span>{dateStr}</span>
        </div>
        <div className="dashboard-actions">
          {onStartRitual && (
            <button className="dashboard-action-btn" onClick={onStartRitual}>
              <Sun size={14} />
              Ritual
            </button>
          )}
          <button className="dashboard-action-btn" onClick={() => setShowQuickAdd(true)}>
            <Plus size={14} />
            Quick add
          </button>
          <button className="dashboard-action-btn" onClick={() => setShowRename(true)}>
            <Wand2 size={14} />
            AI Rename
          </button>
          <button className="dashboard-action-btn" onClick={onNavigateToWeeklyReview}>
            <ClipboardList size={14} />
            Weekly Review
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

          <MITSection
            mits={mits}
            allTasks={allTasks}
            onSetMITs={onSetMITs}
            onSelectTask={onSelectTask}
          />

          {recentMoods.length > 0 && (
            <div className="mood-trend">
              <Moon size={12} />
              <span className="mood-trend-label">Mood</span>
              <div className="mood-trend-dots">
                {recentMoods.map((m) => (
                  <div
                    key={m.date}
                    className="mood-dot"
                    style={{
                      backgroundColor: m.rating >= 4 ? 'var(--success)' : m.rating >= 3 ? 'var(--warning)' : 'var(--danger)',
                      opacity: 0.6 + m.rating * 0.08
                    }}
                    title={`${m.date}: ${m.rating}/5`}
                  />
                ))}
              </div>
            </div>
          )}

          <HabitSection taskLists={taskLists} />

          {suggestedTask && (
            <div
              className="suggested-task-card"
              onClick={() => onSelectTask(suggestedTask.task)}
            >
              <Zap size={14} className="suggested-icon" />
              <div className="suggested-content">
                <span className="suggested-label">Suggested Now</span>
                <span className="suggested-title">{suggestedTask.task.title}</span>
                <span className="suggested-reason">{suggestedTask.reason}</span>
              </div>
              {metadataMap[suggestedTask.task.id]?.energyLevel && (
                <EnergyBadge level={metadataMap[suggestedTask.task.id].energyLevel!} />
              )}
            </div>
          )}

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
