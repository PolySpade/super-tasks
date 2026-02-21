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
import { ErrorBanner } from './components/ErrorBanner'

type View = 'tasks' | 'settings' | 'detail'

export default function App() {
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

  const [view, setView] = useState<View>('tasks')
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [subtaskParentId, setSubtaskParentId] = useState<string | undefined>()
  const [subtaskParentTitle, setSubtaskParentTitle] = useState<string | undefined>()

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
        if (subtaskParentId) {
          setSubtaskParentId(undefined)
          setSubtaskParentTitle(undefined)
        } else if (view !== 'tasks') {
          setView('tasks')
          setSelectedTask(null)
        } else {
          window.api.hideWindow()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [view, subtaskParentId])

  const handleClose = () => window.api.hideWindow()

  const handleSignOut = async () => {
    await signOut()
    setView('tasks')
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
    setView('tasks')
    setSelectedTask(null)
  }

  const handleAddSubtask = (parentId: string) => {
    // Find parent title from the tree
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

  const getTitle = () => {
    switch (view) {
      case 'settings':
        return 'Settings'
      case 'detail':
        return 'Task Details'
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
        onSettingsClick={() => setView(view === 'settings' ? 'tasks' : 'settings')}
        onClose={handleClose}
        showBack={view !== 'tasks'}
        onBack={view === 'detail' ? handleBackFromDetail : () => setView('tasks')}
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
        />
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
    </div>
  )
}
