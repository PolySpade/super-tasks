import { Calendar, Trash2, FileText, Plus, Timer } from 'lucide-react'
import { Task } from '../types'

interface TaskItemProps {
  task: Task
  depth?: number
  onToggle: (taskId: string, completed: boolean) => void
  onDelete: (taskId: string) => void
  onSelect: (task: Task) => void
  onAddSubtask: (parentId: string) => void
  onFocusStart?: (task: Task) => void
}

function formatDueDate(due: string): string {
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

function isOverdue(due: string, status: string): boolean {
  if (status === 'completed') return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dueDate = new Date(due)
  dueDate.setHours(0, 0, 0, 0)
  return dueDate < today
}

function isDueToday(due: string): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dueDate = new Date(due)
  dueDate.setHours(0, 0, 0, 0)
  return dueDate.getTime() === today.getTime()
}

export function TaskItem({ task, depth = 0, onToggle, onDelete, onSelect, onAddSubtask, onFocusStart }: TaskItemProps) {
  const isCompleted = task.status === 'completed'
  const overdue = task.due ? isOverdue(task.due, task.status) : false
  const dueToday = task.due ? isDueToday(task.due) : false
  const hasChildren = task.children && task.children.length > 0
  const isSubtask = depth > 0

  return (
    <>
      <div
        className={`task-item ${isCompleted ? 'completed' : ''} ${isSubtask ? 'subtask' : ''}`}
        style={{ paddingLeft: `${14 + depth * 24}px` }}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('.task-checkbox, .delete-btn, .add-subtask-btn, .focus-btn')) return
          onSelect(task)
        }}
      >
        <label className="task-checkbox" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={isCompleted}
            onChange={() => onToggle(task.id, !isCompleted)}
          />
          <span className={`checkmark ${isSubtask ? 'checkmark-small' : ''}`} />
        </label>
        <div className="task-content">
          <span className="task-title">{task.title}</span>
          <div className="task-meta">
            {task.due && (
              <span className={`task-due ${overdue ? 'overdue' : ''} ${dueToday ? 'due-today' : ''}`}>
                <Calendar size={10} />
                {formatDueDate(task.due)}
              </span>
            )}
            {task.notes && (
              <span className="task-has-notes">
                <FileText size={10} />
              </span>
            )}
            {hasChildren && (
              <span className="subtask-count">
                {task.children!.filter(c => c.status !== 'completed').length}/{task.children!.length}
              </span>
            )}
          </div>
        </div>
        {!isCompleted && onFocusStart && (
          <button
            className="icon-btn focus-btn"
            onClick={(e) => {
              e.stopPropagation()
              onFocusStart(task)
            }}
            title="Start focus session"
          >
            <Timer size={12} />
          </button>
        )}
        {!isSubtask && (
          <button
            className="icon-btn add-subtask-btn"
            onClick={(e) => {
              e.stopPropagation()
              onAddSubtask(task.id)
            }}
            title="Add subtask"
          >
            <Plus size={12} />
          </button>
        )}
        <button
          className="icon-btn delete-btn"
          onClick={(e) => {
            e.stopPropagation()
            onDelete(task.id)
          }}
          title="Delete task"
        >
          <Trash2 size={14} />
        </button>
      </div>
      {hasChildren &&
        task.children!.map((child) => (
          <TaskItem
            key={child.id}
            task={child}
            depth={depth + 1}
            onToggle={onToggle}
            onDelete={onDelete}
            onSelect={onSelect}
            onAddSubtask={onAddSubtask}
            onFocusStart={onFocusStart}
          />
        ))}
    </>
  )
}
