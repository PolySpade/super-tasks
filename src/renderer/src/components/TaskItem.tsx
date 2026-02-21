import { Calendar, Trash2, FileText } from 'lucide-react'
import { Task } from '../types'

interface TaskItemProps {
  task: Task
  onToggle: (taskId: string, completed: boolean) => void
  onDelete: (taskId: string) => void
  onSelect: (task: Task) => void
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

export function TaskItem({ task, onToggle, onDelete, onSelect }: TaskItemProps) {
  const isCompleted = task.status === 'completed'
  const overdue = task.due ? isOverdue(task.due, task.status) : false
  const dueToday = task.due ? isDueToday(task.due) : false

  return (
    <div
      className={`task-item ${isCompleted ? 'completed' : ''}`}
      onClick={(e) => {
        // Don't open detail if clicking checkbox or delete
        if ((e.target as HTMLElement).closest('.task-checkbox, .delete-btn')) return
        onSelect(task)
      }}
    >
      <label className="task-checkbox" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={isCompleted}
          onChange={() => onToggle(task.id, !isCompleted)}
        />
        <span className="checkmark" />
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
        </div>
      </div>
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
  )
}
