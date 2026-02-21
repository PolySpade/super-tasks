import { useState } from 'react'
import { X } from 'lucide-react'
import { TaskList } from '../types'

interface QuickAddModalProps {
  taskLists: TaskList[]
  onClose: () => void
  onCreated: () => void
}

export function QuickAddModal({ taskLists, onClose, onCreated }: QuickAddModalProps) {
  const [listId, setListId] = useState(taskLists.length > 0 ? taskLists[0].id : '')
  const [title, setTitle] = useState('')
  const [due, setDue] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !listId) return
    setSubmitting(true)
    setError(null)
    try {
      const dueIso = due ? new Date(due + 'T00:00:00').toISOString() : undefined
      const result = await window.api.createTask(listId, title.trim(), '', dueIso)
      if (result.success) {
        onCreated()
        onClose()
      } else {
        setError(result.error || 'Failed to create task')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create task')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="plan-confirm-overlay" onClick={onClose}>
      <div className="quick-add-modal" onClick={(e) => e.stopPropagation()}>
        <div className="quick-add-header">
          <span className="quick-add-title">Quick Add Task</span>
          <button className="icon-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="quick-add-form">
          <select
            className="quick-add-select"
            value={listId}
            onChange={(e) => setListId(e.target.value)}
          >
            {taskLists.map((list) => (
              <option key={list.id} value={list.id}>
                {list.title}
              </option>
            ))}
          </select>
          <input
            className="quick-add-input"
            type="text"
            placeholder="Task title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
          <input
            className="quick-add-date"
            type="date"
            value={due}
            onChange={(e) => setDue(e.target.value)}
          />
          {error && <div className="quick-add-error">{error}</div>}
          <button
            type="submit"
            className="quick-add-submit"
            disabled={!title.trim() || !listId || submitting}
          >
            {submitting ? 'Adding...' : 'Add Task'}
          </button>
        </form>
      </div>
    </div>
  )
}
