import { useState } from 'react'
import { ArrowLeft, Calendar, Trash2, X, Save } from 'lucide-react'
import { Task } from '../types'

interface TaskDetailProps {
  task: Task
  onBack: () => void
  onUpdate: (taskId: string, updates: { title?: string; notes?: string; due?: string | null }) => void
  onDelete: (taskId: string) => void
  onToggle: (taskId: string, completed: boolean) => void
}

export function TaskDetail({ task, onBack, onUpdate, onDelete, onToggle }: TaskDetailProps) {
  const [title, setTitle] = useState(task.title)
  const [notes, setNotes] = useState(task.notes || '')
  const [due, setDue] = useState(task.due ? task.due.split('T')[0] : '')
  const isCompleted = task.status === 'completed'

  const hasChanges =
    title !== task.title ||
    notes !== (task.notes || '') ||
    due !== (task.due ? task.due.split('T')[0] : '')

  const handleSave = () => {
    const updates: { title?: string; notes?: string; due?: string | null } = {}
    if (title !== task.title) updates.title = title
    if (notes !== (task.notes || '')) updates.notes = notes
    if (due !== (task.due ? task.due.split('T')[0] : '')) {
      updates.due = due || null
    }
    if (Object.keys(updates).length > 0) {
      onUpdate(task.id, updates)
    }
    onBack()
  }

  const handleDelete = () => {
    onDelete(task.id)
    onBack()
  }

  return (
    <div className="task-detail">
      <div className="task-detail-header">
        <button className="icon-btn" onClick={onBack} title="Back">
          <ArrowLeft size={16} />
        </button>
        <div className="task-detail-actions">
          {hasChanges && (
            <button className="icon-btn save-btn" onClick={handleSave} title="Save changes">
              <Save size={14} />
            </button>
          )}
          <button className="icon-btn" onClick={handleDelete} title="Delete task">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="task-detail-body">
        <div className="task-detail-status">
          <label className="task-checkbox">
            <input
              type="checkbox"
              checked={isCompleted}
              onChange={() => onToggle(task.id, !isCompleted)}
            />
            <span className="checkmark" />
          </label>
          <input
            className="task-detail-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title"
          />
        </div>

        <div className="task-detail-field">
          <label>
            <Calendar size={13} />
            Due date
          </label>
          <div className="task-detail-date">
            <input
              type="date"
              value={due}
              onChange={(e) => setDue(e.target.value)}
            />
            {due && (
              <button
                className="icon-btn"
                onClick={() => setDue('')}
                title="Clear date"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        <div className="task-detail-field">
          <label>Notes</label>
          <textarea
            className="task-detail-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes..."
            rows={5}
          />
        </div>
      </div>

      {hasChanges && (
        <div className="task-detail-footer">
          <button className="save-changes-btn" onClick={handleSave}>
            Save changes
          </button>
        </div>
      )}
    </div>
  )
}
