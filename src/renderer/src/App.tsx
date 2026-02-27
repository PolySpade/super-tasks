import { useState, useEffect, useMemo, useCallback } from 'react'
import { useAuth } from './hooks/useAuth'
import { useTaskLists } from './hooks/useTaskLists'
import { useTasks } from './hooks/useTasks'
import { useMITs } from './hooks/useMITs'
import { Task } from './types'
import { LoginScreen } from './components/LoginScreen'
import { TitleBar } from './components/TitleBar'
import { TaskListSelector } from './components/TaskListSelector'
import { TaskList } from './components/TaskList'
import { AddTaskForm } from './components/AddTaskForm'
import { TaskDetail } from './components/TaskDetail'
import { SettingsPanel } from './components/SettingsPanel'
import { PlanView } from './components/PlanView'
import { ErrorBanner } from './components/ErrorBanner'
import { Dashboard } from './components/Dashboard'
import { DeadlineList } from './components/DeadlineList'
import { FocusMode } from './components/FocusMode'
import { CalendarView } from './components/CalendarView'
import { TimerView } from './components/TimerView'
import { WeeklyReview } from './components/WeeklyReview'
import { QuickCaptureInput } from './components/QuickCaptureInput'
import { EODReview } from './components/EODReview'
import { PersonaSetupModal } from './components/PersonaSetupModal'
import { useEODReview } from './hooks/useEODReview'
import { DailyRitual } from './components/DailyRitual'
import { useDailyRitual } from './hooks/useDailyRitual'
import { LayoutDashboard, ListTodo, CalendarDays, CalendarClock, Timer, Minimize2, Maximize2 } from 'lucide-react'

type Tab = 'dashboard' | 'tasks' | 'calendar' | 'plan' | 'timer'
type View = 'dashboard' | 'tasks' | 'settings' | 'detail' | 'plan' | 'calendar' | 'deadlines' | 'timer' | 'weekly-review'

// Check if we're in calendar window mode
const isCalendarWindow = window.location.search.includes('view=calendar')
const isQuickCapture = window.location.search.includes('view=quick-capture')

export default function App() {
  if (isQuickCapture) {
    return <QuickCaptureInput />
  }
  if (isCalendarWindow) {
    return <CalendarView />
  }
  return <TrayApp />
}

function TrayApp() {
  const { signedIn, loading: authLoading, signIn, signOut } = useAuth()
  const { taskLists, selectedListId, setSelectedListId, refreshLists, error: listsError } =
    useTaskLists(signedIn)
  const {
    tasks,
    allTasks,
    loading: tasksLoading,
    error: tasksError,
    addTask,
    updateTask,
    removeTask,
    toggleComplete,
    refreshTasks,
    clearError,
    metadataMap,
    setMeta
  } = useTasks(signedIn, selectedListId)

  const { mits, setMITs, addMIT, removeMIT, isMIT } = useMITs()
  const { shouldShow: autoShowEOD, dismiss: dismissAutoEOD } = useEODReview(signedIn)
  const [manualEOD, setManualEOD] = useState(false)
  const shouldShowEOD = autoShowEOD || manualEOD
  const dismissEOD = () => { dismissAutoEOD(); setManualEOD(false) }
  const { shouldShow: shouldShowRitual, show: showRitual, dismiss: dismissRitual, complete: completeRitual } = useDailyRitual(signedIn)

  const [showPersonaSetup, setShowPersonaSetup] = useState(false)
  const [personaChecked, setPersonaChecked] = useState(false)
  const [tab, setTab] = useState<Tab>('dashboard')
  const [view, setView] = useState<View>('dashboard')
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [subtaskParentId, setSubtaskParentId] = useState<string | undefined>()
  const [subtaskParentTitle, setSubtaskParentTitle] = useState<string | undefined>()
  const [focusTask, setFocusTask] = useState<Task | null>(null)
  const [focusMode, setFocusMode] = useState<'pomodoro' | 'timebox'>('pomodoro')
  const [focusTimeBox, setFocusTimeBox] = useState<number | undefined>()
  const [miniTimer, setMiniTimer] = useState(false)
  const [miniTasks, setMiniTasks] = useState(false)
  const [dashboardKey, setDashboardKey] = useState(0)

  const [pendingOffline, setPendingOffline] = useState(0)
  const [isOffline, setIsOffline] = useState(!navigator.onLine)

  // Track online/offline status
  useEffect(() => {
    const goOffline = () => setIsOffline(true)
    const goOnline = () => {
      setIsOffline(false)
      // Auto-sync when coming back online
      window.api.processOfflineQueue().then(() => {
        window.api.getOfflineQueue().then((res) => {
          if (res.success) setPendingOffline(res.data?.length || 0)
        })
      })
    }
    window.addEventListener('offline', goOffline)
    window.addEventListener('online', goOnline)
    return () => {
      window.removeEventListener('offline', goOffline)
      window.removeEventListener('online', goOnline)
    }
  }, [])

  // Suppress error banners when offline
  const error = isOffline ? null : (listsError || tasksError)

  // Auto-refresh on window show + offline queue sync
  useEffect(() => {
    if (!signedIn) return
    const cleanup = window.api.onWindowShown(() => {
      refreshLists()
      refreshTasks()
      // Check offline queue and try to process
      window.api.processOfflineQueue().then(() => {
        window.api.getOfflineQueue().then((res) => {
          if (res.success) setPendingOffline(res.data?.length || 0)
        })
      })
    })
    return cleanup
  }, [signedIn])

  // Check offline queue on mount
  useEffect(() => {
    if (!signedIn) return
    window.api.getOfflineQueue().then((res) => {
      if (res.success) setPendingOffline(res.data?.length || 0)
    })
  }, [signedIn])

  const taskCount = useMemo(() => {
    const total = allTasks.length
    const completed = allTasks.filter((t) => t.status === 'completed').length
    return { total, completed }
  }, [allTasks])

  // Check persona on mount after auth
  useEffect(() => {
    if (signedIn && !personaChecked) {
      window.api.isPersonaConfigured().then((result) => {
        if (result.success && result.data === false) {
          setShowPersonaSetup(true)
        }
        setPersonaChecked(true)
      })
    }
  }, [signedIn, personaChecked])

  // Keep selectedTask in sync with tasks array
  useEffect(() => {
    if (selectedTask) {
      const findTask = (list: Task[]): Task | undefined => {
        for (const t of list) {
          if (t.id === selectedTask.id) return t
          if (t.children) {
            const found = findTask(t.children)
            if (found) return found
          }
        }
        return undefined
      }
      const updated = findTask(tasks)
      if (updated) setSelectedTask(updated)
    }
  }, [tasks])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (focusTask) return
        if (subtaskParentId) {
          setSubtaskParentId(undefined)
          setSubtaskParentTitle(undefined)
        } else if (view === 'detail' || view === 'settings' || view === 'deadlines' || view === 'weekly-review') {
          setView(tab === 'calendar' ? 'dashboard' : tab)
          setSelectedTask(null)
        } else {
          window.api.hideWindow()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [view, tab, subtaskParentId, focusTask])

  const handleTabChange = (newTab: Tab) => {
    if (newTab === 'calendar') {
      window.api.openCalendarWindow()
      return
    }
    if (newTab === 'dashboard') setDashboardKey((k) => k + 1)
    if (newTab === 'tasks') {
      refreshLists()
      refreshTasks()
    }
    setTab(newTab)
    setView(newTab)
    setSelectedTask(null)
  }

  const handleClose = () => window.api.hideWindow()

  const handleSignOut = async () => {
    await signOut()
    setView('dashboard')
    setTab('dashboard')
  }

  const handleRefresh = () => {
    refreshLists()
    refreshTasks()
  }

  const handleSelectTask = (task: Task) => {
    setSelectedTask(task)
    setView('detail')
  }

  const handleBackFromDetail = () => {
    const target = tab === 'calendar' ? 'dashboard' : tab
    if (target === 'dashboard') setDashboardKey((k) => k + 1)
    setView(target)
    setSelectedTask(null)
  }

  const handleAddSubtask = (parentId: string) => {
    const findTitle = (list: Task[]): string | undefined => {
      for (const t of list) {
        if (t.id === parentId) return t.title
        if (t.children) {
          const found = findTitle(t.children)
          if (found) return found
        }
      }
      return undefined
    }
    setSubtaskParentId(parentId)
    setSubtaskParentTitle(findTitle(tasks) || 'Task')
  }

  const handleCancelSubtask = () => {
    setSubtaskParentId(undefined)
    setSubtaskParentTitle(undefined)
  }

  const handleOpenSettings = () => {
    setView('settings')
  }

  const handleFocusStart = (task: Task) => {
    const meta = metadataMap[task.id]
    if (meta?.timeBoxMinutes) {
      setFocusMode('timebox')
      setFocusTimeBox(meta.timeBoxMinutes)
    } else {
      setFocusMode('pomodoro')
      setFocusTimeBox(undefined)
    }
    setFocusTask(task)
  }

  const handleFocusExit = (_summary: { totalMinutes: number; sessionsCompleted: number }) => {
    setFocusTask(null)
    refreshTasks()
  }

  const handleToggleMiniTimer = async () => {
    if (miniTimer) {
      // Expand back to full size
      await window.api.setWindowSize(440, 520)
      setMiniTimer(false)
    } else {
      // Shrink to mini timer
      setTab('timer')
      setView('timer')
      await window.api.setWindowSize(220, 220)
      setMiniTimer(true)
    }
  }

  const handleToggleMiniTasks = async () => {
    if (miniTasks) {
      await window.api.setWindowSize(440, 520)
      setMiniTasks(false)
    } else {
      setTab('tasks')
      setView('tasks')
      setSelectedTask(null)
      await window.api.setWindowSize(300, 400)
      setMiniTasks(true)
    }
  }

  const handleToggleMIT = (taskId: string) => {
    if (isMIT(taskId)) {
      removeMIT(taskId)
    } else {
      addMIT(taskId)
    }
  }

  const getTitle = () => {
    switch (view) {
      case 'settings':
        return 'Settings'
      case 'detail':
        return 'Task Details'
      case 'plan':
        return 'Day Planner'
      case 'dashboard':
        return 'SuperTasks'
      case 'deadlines':
        return 'Deadlines'
      case 'timer':
        return 'Focus Timer'
      case 'weekly-review':
        return 'Weekly Review'
      default:
        return 'SuperTasks'
    }
  }

  if (!signedIn && !authLoading) {
    return (
      <div className="app">
        <TitleBar onSettingsClick={() => {}} onClose={handleClose} title="SuperTasks" />
        <LoginScreen onSignIn={signIn} loading={authLoading} />
      </div>
    )
  }

  if (miniTasks) {
    return (
      <div className="app app-mini-tasks">
        <div className="mini-tasks-header">
          <span className="mini-tasks-title">Tasks</span>
          <div className="mini-tasks-actions">
            <span
              className="status-dot"
              title={isOffline ? 'Offline' : 'Online'}
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: isOffline ? '#f44336' : '#4caf50',
                display: 'inline-block',
                flexShrink: 0
              }}
            />
            <button className="icon-btn" onClick={handleToggleMiniTasks} title="Expand">
              <Maximize2 size={12} />
            </button>
            <button className="icon-btn" onClick={handleClose} title="Close">
              <span style={{ fontSize: 14, lineHeight: 1 }}>&times;</span>
            </button>
          </div>
        </div>
        {pendingOffline > 0 && (
          <div className="mini-tasks-offline-bar">
            {pendingOffline} pending sync
          </div>
        )}
        <div className="mini-tasks-list">
          <TaskList
            tasks={tasks}
            loading={tasksLoading}
            onToggle={toggleComplete}
            onDelete={removeTask}
            onSelectTask={handleSelectTask}
            onAddSubtask={handleAddSubtask}
            metadataMap={metadataMap}
          />
        </div>
        <AddTaskForm
          onAdd={addTask}
          parentId={subtaskParentId}
          parentTitle={subtaskParentTitle}
          onCancelSubtask={handleCancelSubtask}
        />
      </div>
    )
  }

  return (
    <div className={`app ${miniTimer ? 'app-mini' : ''}`}>
      {!miniTimer && (
        <TitleBar
          onSettingsClick={() => setView(view === 'settings' ? (tab === 'calendar' ? 'dashboard' : tab) : 'settings')}
          onClose={handleClose}
          showBack={view === 'detail' || view === 'settings' || view === 'deadlines' || view === 'weekly-review'}
          onBack={
            view === 'detail'
              ? handleBackFromDetail
              : view === 'deadlines' || view === 'weekly-review'
                ? () => setView('dashboard')
                : () => setView(tab === 'calendar' ? 'dashboard' : tab)
          }
          title={getTitle()}
          isOffline={isOffline}
        />
      )}

      {!miniTimer && error && <ErrorBanner message={error} onDismiss={clearError} />}

      {!miniTimer && pendingOffline > 0 && (
        <div style={{
          background: '#3a3000',
          color: '#ffd54f',
          padding: '4px 12px',
          fontSize: '12px',
          textAlign: 'center',
          borderBottom: '1px solid #5a4800'
        }}>
          {pendingOffline} change{pendingOffline !== 1 ? 's' : ''} pending sync
        </div>
      )}

      {miniTimer ? (
        <TimerView taskLists={taskLists} mini onToggleMini={handleToggleMiniTimer} onToggleComplete={toggleComplete} />
      ) : view === 'settings' ? (
        <SettingsPanel onSignOut={handleSignOut} />
      ) : view === 'detail' && selectedTask ? (
        <TaskDetail
          task={selectedTask}
          onBack={handleBackFromDetail}
          onUpdate={updateTask}
          onDelete={removeTask}
          onToggle={toggleComplete}
          onFocusStart={handleFocusStart}
          metadata={metadataMap[selectedTask.id]}
          onSetMetadata={setMeta}
        />
      ) : view === 'plan' ? (
        <PlanView
          signedIn={signedIn}
          taskLists={taskLists}
          onOpenSettings={handleOpenSettings}
          mits={mits}
        />
      ) : view === 'deadlines' ? (
        <DeadlineList
          signedIn={signedIn}
          taskLists={taskLists}
          onBack={() => setView('dashboard')}
        />
      ) : view === 'timer' ? (
        <TimerView taskLists={taskLists} onToggleMini={handleToggleMiniTimer} onToggleComplete={toggleComplete} />
      ) : view === 'weekly-review' ? (
        <WeeklyReview
          signedIn={signedIn}
          taskLists={taskLists}
          onBack={() => setView('dashboard')}
          onSelectTask={handleSelectTask}
          onUpdateTask={updateTask}
        />
      ) : view === 'dashboard' ? (
        <>
          {authLoading ? (
            <div className="task-list-empty">
              <div className="spin-container">
                <div className="spinner" />
              </div>
            </div>
          ) : (
            <Dashboard
              key={dashboardKey}
              signedIn={signedIn}
              taskLists={taskLists}
              onNavigateToPlan={() => handleTabChange('plan')}
              onNavigateToDeadlines={() => setView('deadlines')}
              onNavigateToWeeklyReview={() => setView('weekly-review')}
              onSelectTask={handleSelectTask}
              mits={mits}
              onSetMITs={setMITs}
              allTasks={allTasks}
              metadataMap={metadataMap}
              onStartRitual={showRitual}
              onStartEODReview={() => setManualEOD(true)}
            />
          )}
        </>
      ) : (
        <>
          {authLoading ? (
            <div className="task-list-empty">
              <div className="spin-container">
                <div className="spinner" />
              </div>
            </div>
          ) : (
            <>
              <TaskListSelector
                taskLists={taskLists}
                selectedListId={selectedListId}
                onSelect={setSelectedListId}
                onRefresh={handleRefresh}
                taskCount={taskCount}
                isOffline={isOffline}
                onMinimize={handleToggleMiniTasks}
              />
              <TaskList
                tasks={tasks}
                loading={tasksLoading}
                onToggle={toggleComplete}
                onDelete={removeTask}
                onSelectTask={handleSelectTask}
                onAddSubtask={handleAddSubtask}
                onFocusStart={handleFocusStart}
                mits={mits}
                onToggleMIT={handleToggleMIT}
                metadataMap={metadataMap}
              />
              <AddTaskForm
                onAdd={addTask}
                parentId={subtaskParentId}
                parentTitle={subtaskParentTitle}
                onCancelSubtask={handleCancelSubtask}
              />
            </>
          )}
        </>
      )}

      {/* Bottom tab bar */}
      {!miniTimer && signedIn && !authLoading && view !== 'detail' && view !== 'settings' && view !== 'deadlines' && view !== 'weekly-review' && (
        <div className="tab-bar">
          <button
            className={`tab-bar-btn ${tab === 'dashboard' ? 'active' : ''}`}
            onClick={() => handleTabChange('dashboard')}
          >
            <LayoutDashboard size={16} />
            <span>Home</span>
          </button>
          <button
            className={`tab-bar-btn ${tab === 'tasks' ? 'active' : ''}`}
            onClick={() => handleTabChange('tasks')}
          >
            <ListTodo size={16} />
            <span>Tasks</span>
          </button>
          <button
            className={`tab-bar-btn ${tab === 'timer' ? 'active' : ''}`}
            onClick={() => handleTabChange('timer')}
          >
            <Timer size={16} />
            <span>Timer</span>
          </button>
          <button
            className={`tab-bar-btn ${tab === 'calendar' ? 'active' : ''}`}
            onClick={() => handleTabChange('calendar')}
          >
            <CalendarDays size={16} />
            <span>Calendar</span>
          </button>
          <button
            className={`tab-bar-btn ${tab === 'plan' ? 'active' : ''}`}
            onClick={() => handleTabChange('plan')}
          >
            <CalendarClock size={16} />
            <span>Plan</span>
          </button>
        </div>
      )}

      {/* Focus mode overlay */}
      {!miniTimer && focusTask && (
        <FocusMode
          task={focusTask}
          onExit={handleFocusExit}
          onToggleComplete={toggleComplete}
          mode={focusMode}
          timeBoxMinutes={focusTimeBox}
        />
      )}

      {/* End-of-day review overlay */}
      {!miniTimer && shouldShowEOD && !focusTask && !shouldShowRitual && (
        <EODReview
          signedIn={signedIn}
          taskLists={taskLists}
          onDismiss={dismissEOD}
          onUpdateTask={updateTask}
        />
      )}

      {/* Daily planning ritual overlay */}
      {!miniTimer && shouldShowRitual && !focusTask && (
        <DailyRitual
          signedIn={signedIn}
          taskLists={taskLists}
          mits={mits}
          onSetMITs={setMITs}
          onComplete={completeRitual}
          onDismiss={dismissRitual}
          onNavigateToPlan={() => { completeRitual(); handleTabChange('plan') }}
        />
      )}

      {/* Persona setup modal */}
      {!miniTimer && showPersonaSetup && (
        <PersonaSetupModal
          onComplete={() => setShowPersonaSetup(false)}
          onSkip={() => setShowPersonaSetup(false)}
        />
      )}
    </div>
  )
}
