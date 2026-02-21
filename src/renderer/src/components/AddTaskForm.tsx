import { useState } from 'react'
import { Plus, Calendar, X } from 'lucide-react'

interface AddTaskFormProps {
  onAdd: (title: string, notes?: string, due?: string) => void
}

export function AddTaskForm({ onAdd }: AddTaskFormProps) {
  const [title, setTitle] = useState('')
  const [due, setDue] = useState('')
  const [showDatePicker, setShowDatePicker] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) return
    onAdd(trimmed, undefined, due || undefined)
    setTitle('')
    setDue('')
    setShowDatePicker(false)
  }

  const todayStr = new Date().toISOString().split('T')[0]

  return (
    <div className="add-task-container">
      {showDatePicker && (
        <div className="add-task-extras">
          <div className="date-picker-row">
            <Calendar size={13} />
            <input
              type="date"
              value={due}
              min={todayStr}
              onChange={(e) => setDue(e.target.value)}
            />
            {due && (
              <button
                className="icon-btn"
                onClick={() => setDue('')}
                title="Clear date"
                type="button"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      )}
      <form className="add-task-form" onSubmit={handleSubmit}>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a task..."
        />
        <button
          type="button"
          className={`icon-btn date-toggle ${due ? 'has-date' : ''}`}
          onClick={() => setShowDatePicker(!showDatePicker)}
          title="Set due date"
        >
          <Calendar size={14} />
        </button>
        <button type="submit" className="add-btn" disabled={!title.trim()} title="Add task">
          <Plus size={16} />
        </button>
      </form>
    </div>
  )
}
