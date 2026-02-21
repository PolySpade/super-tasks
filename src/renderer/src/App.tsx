import { useState, useEffect, useMemo } from 'react'
import { useAuth } from './hooks/useAuth'
import { useTaskLists } from './hooks/useTaskLists'
import { useTasks } from './hooks/useTasks'
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
import { LayoutDashboard, ListTodo, CalendarDays, CalendarClock } from 'lucide-react'

type Tab = 'dashboard' | 'tasks' | 'calendar' | 'plan'
type View = 'dashboard' | 'tasks' | 'settings' | 'detail' | 'plan' | 'calendar' | 'deadlines'

// Check if we're in calendar window mode
const isCalendarWindow = window.location.search.includes('view=calendar')

export default function App() {
  // If this is the calendar window, render CalendarView full-screen
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
    clearError
  } = useTasks(signedIn, selectedListId)

  const [tab, setTab] = useState<Tab>('dashboard')
  const [view, setView] = useState<View>('dashboard')
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [subtaskParentId, setSubtaskParentId] = useState<string | undefined>()
  const [subtaskParentTitle, setSubtaskParentTitle] = useState<string | undefined>()
  const [focusTask, setFocusTask] = useState<Task | null>(null)

  const error = listsError || tasksError

  const taskCount = useMemo(() => {
    const total = allTasks.length
    const completed = allTasks.filter((t) => t.status === 'completed').length
    return { total, completed }
  }, [allTasks])

  // Keep selectedTask in sync with tasks array (search tree)
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
        if (focusTask) return // Let FocusMode handle its own escape
        if (subtaskParentId) {
          setSubtaskParentId(undefined)
          setSubtaskParentTitle(undefined)
        } else if (view === 'detail' || view === 'settings' || view === 'deadlines') {
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
    setView(tab === 'calendar' ? 'dashboard' : tab)
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
    setFocusTask(task)
  }

  const handleFocusExit = (_summary: { totalMinutes: number; sessionsCompleted: number }) => {
    setFocusTask(null)
    refreshTasks()
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
        return 'Google Tasks'
      case 'deadlines':
        return 'Deadlines'
      default:
        return 'Google Tasks'
    }
  }

  if (!signedIn && !authLoading) {
    return (
      <div className="app">
        <TitleBar onSettingsClick={() => {}} onClose={handleClose} title="Google Tasks" />
        <LoginScreen onSignIn={signIn} loading={authLoading} />
      </div>
    )
  }

  return (
    <div className="app">
      <TitleBar
        onSettingsClick={() => setView(view === 'settings' ? (tab === 'calendar' ? 'dashboard' : tab) : 'settings')}
        onClose={handleClose}
        showBack={view === 'detail' || view === 'settings' || view === 'deadlines'}
        onBack={
          view === 'detail'
            ? handleBackFromDetail
            : view === 'deadlines'
              ? () => setView('dashboard')
              : () => setView(tab === 'calendar' ? 'dashboard' : tab)
        }
        title={getTitle()}
      />

      {error && <ErrorBanner message={error} onDismiss={clearError} />}

      {view === 'settings' ? (
        <SettingsPanel onSignOut={handleSignOut} />
      ) : view === 'detail' && selectedTask ? (
        <TaskDetail
          task={selectedTask}
          onBack={handleBackFromDetail}
          onUpdate={updateTask}
          onDelete={removeTask}
          onToggle={toggleComplete}
          onFocusStart={handleFocusStart}
        />
      ) : view === 'plan' ? (
        <PlanView
          signedIn={signedIn}
          taskLists={taskLists}
          onOpenSettings={handleOpenSettings}
        />
      ) : view === 'deadlines' ? (
        <DeadlineList
          signedIn={signedIn}
          taskLists={taskLists}
          onBack={() => setView('dashboard')}
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
              signedIn={signedIn}
              taskLists={taskLists}
              onNavigateToPlan={() => handleTabChange('plan')}
              onNavigateToDeadlines={() => setView('deadlines')}
              onSelectTask={handleSelectTask}
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
              />
              <TaskList
                tasks={tasks}
                loading={tasksLoading}
                onToggle={toggleComplete}
                onDelete={removeTask}
                onSelectTask={handleSelectTask}
                onAddSubtask={handleAddSubtask}
                onFocusStart={handleFocusStart}
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
      {signedIn && !authLoading && view !== 'detail' && view !== 'settings' && view !== 'deadlines' && (
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
      {focusTask && (
        <FocusMode
          task={focusTask}
          onExit={handleFocusExit}
        />
      )}
    </div>
  )
}
