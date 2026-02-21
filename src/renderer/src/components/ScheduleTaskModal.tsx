import { useState, useMemo } from 'react'
import { Search, Calendar, Clock, Plus } from 'lucide-react'
import { Task } from '../types'

interface ScheduleTaskModalProps {
  tasks: Task[]
  selectedDate: Date
  selectedEnd?: Date
  calendarId: string
  onClose: () => void
  onCreated: () => void
}

export function ScheduleTaskModal({
  tasks,
  selectedDate,
  selectedEnd,
  calendarId,
  onClose,
  onCreated
}: ScheduleTaskModalProps) {
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const [customName, setCustomName] = useState('')

  // Flatten tasks and filter to incomplete only
  const incompleteTasks = useMemo(() => {
    const flat: Task[] = []
    const flatten = (list: Task[]): void => {
      for (const t of list) {
        if (t.status === 'needsAction') {
          flat.push(t)
        }
        if (t.children && t.children.length > 0) {
          flatten(t.children)
        }
      }
    }
    flatten(tasks)
    return flat
  }, [tasks])

  const filtered = useMemo(() => {
    if (!search.trim()) return incompleteTasks
    const q = search.toLowerCase()
    return incompleteTasks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.notes && t.notes.toLowerCase().includes(q))
    )
  }, [incompleteTasks, search])

  const createEvent = async (summary: string, description?: string) => {
    if (creating) return
    setCreating(true)

    const startISO = selectedDate.toISOString()
    const endDate = selectedEnd || new Date(selectedDate.getTime() + 60 * 60 * 1000)
    const endISO = endDate.toISOString()

    try {
      const result = await window.api.createCalendarEvent(calendarId, {
        summary,
        start: startISO,
        end: endISO,
        description
      })
      if (result.success) {
        onCreated()
      }
    } finally {
      setCreating(false)
    }
  }

  const handleSelect = (task: Task) => {
    createEvent(task.title, task.notes || undefined)
  }

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!customName.trim()) return
    createEvent(customName.trim())
  }

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
  }

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="plan-confirm-overlay" onClick={onClose}>
      <div
        className="plan-confirm-card schedule-task-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="schedule-modal-header">
          <h3 className="schedule-modal-title">Add Event</h3>
          <div className="schedule-modal-time">
            <Calendar size={12} />
            <span>{formatDate(selectedDate)}</span>
            <Clock size={12} />
            <span>
              {formatTime(selectedDate)}
              {selectedEnd ? ` – ${formatTime(selectedEnd)}` : ''}
            </span>
          </div>
        </div>

        {/* Custom event name */}
        <form className="schedule-modal-custom" onSubmit={handleCustomSubmit}>
          <input
            type="text"
            className="schedule-modal-custom-input"
            placeholder="Event name (e.g. Lunch, Gym, Meeting)"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            autoFocus
          />
          <button
            type="submit"
            className="schedule-modal-custom-btn"
            disabled={creating || !customName.trim()}
          >
            <Plus size={14} />
          </button>
        </form>

        <div className="schedule-modal-divider">
          <span>or pick a task</span>
        </div>

        <div className="schedule-modal-search">
          <Search size={14} />
          <input
            type="text"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="schedule-modal-list">
          {filtered.length === 0 ? (
            <div className="schedule-modal-empty">
              {incompleteTasks.length === 0
                ? 'No incomplete tasks available'
                : 'No tasks match your search'}
            </div>
          ) : (
            filtered.map((task) => (
              <button
                key={task.id}
                className="schedule-modal-task"
                onClick={() => handleSelect(task)}
                disabled={creating}
              >
                <span className="schedule-modal-task-title">{task.title}</span>
                {task.notes && (
                  <span className="schedule-modal-task-notes">
                    {task.notes.slice(0, 60)}
                    {task.notes.length > 60 ? '...' : ''}
                  </span>
                )}
              </button>
            ))
          )}
        </div>

        <div className="plan-confirm-actions">
          <button className="plan-confirm-cancel" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
