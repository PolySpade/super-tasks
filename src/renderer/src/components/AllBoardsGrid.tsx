import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Calendar } from 'lucide-react'
import { Task, TaskList } from '../types'

interface AllBoardsGridProps {
  signedIn: boolean
  taskLists: TaskList[]
  onSelectTask: (task: Task, listId: string) => void
  onToggle: (taskId: string, completed: boolean, listId: string) => void
  onExit: () => void
}

function flattenIncomplete(tasks: Task[]): Task[] {
  const result: Task[] = []
  for (const t of tasks) {
    if (t.status !== 'completed') result.push(t)
    if (t.children) result.push(...flattenIncomplete(t.children))
  }
  return result
}

function getDueClass(due?: string): string {
  if (!due) return ''
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dueDate = new Date(due)
  dueDate.setHours(0, 0, 0, 0)
  if (dueDate < today) return 'overdue'
  if (dueDate.getTime() === today.getTime()) return 'due-today'
  return ''
}

function formatDue(due: string): string {
  const date = new Date(due)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const dueDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  if (dueDate.getTime() === today.getTime()) return 'Today'
  if (dueDate.getTime() === tomorrow.getTime()) return 'Tomorrow'

  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (dueDate.getTime() === yesterday.getTime()) return 'Yesterday'

  return dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

interface DragState {
  taskId: string
  sourceListId: string
  task: Task
}

export function AllBoardsGrid({ signedIn, taskLists, onSelectTask, onToggle, onExit }: AllBoardsGridProps) {
  const [tasksByList, setTasksByList] = useState<Record<string, Task[]>>({})
  const [loading, setLoading] = useState(true)
  const [dragState, setDragState] = useState<DragState | null>(null)
  const [dropTargetListId, setDropTargetListId] = useState<string | null>(null)
  const [moving, setMoving] = useState<string | null>(null)
  const dragGhostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!signedIn || taskLists.length === 0) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)

    Promise.all(
      taskLists.map(async (list) => {
        const res = await window.api.getTasks(list.id)
        return { listId: list.id, tasks: res.success && res.data ? (res.data as Task[]) : [] }
      })
    ).then((results) => {
      if (cancelled) return
      const map: Record<string, Task[]> = {}
      for (const r of results) {
        map[r.listId] = flattenIncomplete(r.tasks)
      }
      setTasksByList(map)
      setLoading(false)
    })

    return () => { cancelled = true }
  }, [signedIn, taskLists])

  const handleDragStart = (e: React.DragEvent, task: Task, listId: string) => {
    setDragState({ taskId: task.id, sourceListId: listId, task })
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', task.id)
    // Style the dragged element
    const el = e.currentTarget as HTMLElement
    requestAnimationFrame(() => el.classList.add('dragging'))
  }

  const handleDragEnd = (e: React.DragEvent) => {
    const el = e.currentTarget as HTMLElement
    el.classList.remove('dragging')
    setDragState(null)
    setDropTargetListId(null)
  }

  const handleDragOver = (e: React.DragEvent, listId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDropTargetListId(listId)
  }

  const handleDragLeave = (e: React.DragEvent, listId: string) => {
    // Only clear if we're actually leaving the column (not entering a child)
    const relatedTarget = e.relatedTarget as HTMLElement | null
    const currentTarget = e.currentTarget as HTMLElement
    if (!relatedTarget || !currentTarget.contains(relatedTarget)) {
      if (dropTargetListId === listId) setDropTargetListId(null)
    }
  }

  const handleDrop = async (e: React.DragEvent, targetListId: string) => {
    e.preventDefault()
    setDropTargetListId(null)

    if (!dragState || dragState.sourceListId === targetListId) {
      setDragState(null)
      return
    }

    const { task, sourceListId } = dragState
    setDragState(null)
    setMoving(task.id)

    // Optimistic update: move task in local state immediately
    setTasksByList((prev) => {
      const next = { ...prev }
      next[sourceListId] = (prev[sourceListId] || []).filter((t) => t.id !== task.id)
      next[targetListId] = [...(prev[targetListId] || []), task]
      return next
    })

    try {
      // Create in destination list, then delete from source
      const createRes = await window.api.createTask(targetListId, task.title, task.notes, task.due)
      if (createRes.success) {
        await window.api.deleteTask(sourceListId, task.id)
      } else {
        // Revert on failure
        setTasksByList((prev) => {
          const next = { ...prev }
          next[targetListId] = (prev[targetListId] || []).filter((t) => t.id !== task.id)
          next[sourceListId] = [...(prev[sourceListId] || []), task]
          return next
        })
      }
    } catch {
      // Revert on error
      setTasksByList((prev) => {
        const next = { ...prev }
        next[targetListId] = (prev[targetListId] || []).filter((t) => t.id !== task.id)
        next[sourceListId] = [...(prev[sourceListId] || []), task]
        return next
      })
    } finally {
      setMoving(null)
    }
  }

  const handleToggle = (taskId: string, listId: string) => {
    // Optimistic: remove from local state
    setTasksByList((prev) => {
      const next = { ...prev }
      next[listId] = (prev[listId] || []).filter((t) => t.id !== taskId)
      return next
    })
    onToggle(taskId, true, listId)
  }

  if (loading) {
    return (
      <div className="task-list-empty">
        <div className="spin-container">
          <div className="spinner" />
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <div className="grid-header">
        <button className="icon-btn" onClick={onExit} title="Back to single list">
          <ArrowLeft size={14} />
        </button>
        <span className="grid-header-title">All Boards</span>
        <span style={{ width: 24 }} />
      </div>
      <div className="all-boards-grid">
        {taskLists.map((list) => {
          const tasks = tasksByList[list.id] || []
          const isDropTarget = dropTargetListId === list.id && dragState?.sourceListId !== list.id
          return (
            <div
              key={list.id}
              className={`board-column ${isDropTarget ? 'board-column-drop-target' : ''}`}
              onDragOver={(e) => handleDragOver(e, list.id)}
              onDragLeave={(e) => handleDragLeave(e, list.id)}
              onDrop={(e) => handleDrop(e, list.id)}
            >
              <div className="board-column-header">
                <span>{list.title}</span>
                <span className="board-column-count">{tasks.length}</span>
              </div>
              {tasks.length === 0 ? (
                <div className="board-column-empty">
                  {isDropTarget ? 'Drop here' : 'No tasks'}
                </div>
              ) : (
                tasks.map((task) => (
                  <div
                    key={task.id}
                    className={`board-task ${moving === task.id ? 'board-task-moving' : ''}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task, list.id)}
                    onDragEnd={handleDragEnd}
                  >
                    <label className="task-checkbox" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={false}
                        onChange={() => handleToggle(task.id, list.id)}
                      />
                      <span className="checkmark checkmark-small" />
                    </label>
                    <span
                      className="board-task-title"
                      onClick={() => onSelectTask(task, list.id)}
                    >
                      {task.title}
                    </span>
                    {task.due && (
                      <span className={`task-due board-task-due ${getDueClass(task.due)}`}>
                        <Calendar size={9} />
                        {formatDue(task.due)}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          )
        })}
      </div>
      <div ref={dragGhostRef} style={{ position: 'fixed', pointerEvents: 'none', top: -1000 }} />
    </div>
  )
}
