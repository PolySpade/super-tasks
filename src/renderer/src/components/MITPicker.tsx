import { useState, useMemo } from 'react'
import { Search, Star } from 'lucide-react'
import { Task } from '../types'

interface MITPickerProps {
  allTasks: Task[]
  currentMITs: string[]
  onSave: (taskIds: string[]) => void
  onClose: () => void
}

const MAX_MITS = 3

export function MITPicker({ allTasks, currentMITs, onSave, onClose }: MITPickerProps) {
  const [selected, setSelected] = useState<string[]>([...currentMITs])
  const [search, setSearch] = useState('')
  const [dateMode, setDateMode] = useState<'today' | 'tomorrow'>('today')

  const incompleteTasks = useMemo(() => {
    const flat: Task[] = []
    const flatten = (list: Task[]): void => {
      for (const t of list) {
        if (t.status === 'needsAction') flat.push(t)
        if (t.children) flatten(t.children)
      }
    }
    flatten(allTasks)
    return flat
  }, [allTasks])

  const filtered = useMemo(() => {
    if (!search.trim()) return incompleteTasks
    const q = search.toLowerCase()
    return incompleteTasks.filter(
      (t) => t.title.toLowerCase().includes(q) || (t.notes && t.notes.toLowerCase().includes(q))
    )
  }, [incompleteTasks, search])

  const toggleTask = (taskId: string) => {
    if (selected.includes(taskId)) {
      setSelected(selected.filter((id) => id !== taskId))
    } else if (selected.length < MAX_MITS) {
      setSelected([...selected, taskId])
    }
  }

  return (
    <div className="plan-confirm-overlay" onClick={onClose}>
      <div className="plan-confirm-card mit-picker" onClick={(e) => e.stopPropagation()}>
        <div className="mit-picker-header">
          <Star size={14} />
          <h3>Pick MITs ({selected.length}/{MAX_MITS})</h3>
        </div>

        <div className="mit-picker-tabs">
          <button
            className={`mit-picker-tab ${dateMode === 'today' ? 'active' : ''}`}
            onClick={() => setDateMode('today')}
          >
            Today
          </button>
          <button
            className={`mit-picker-tab ${dateMode === 'tomorrow' ? 'active' : ''}`}
            onClick={() => setDateMode('tomorrow')}
          >
            Tomorrow
          </button>
        </div>

        <div className="schedule-modal-search">
          <Search size={14} />
          <input
            type="text"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>

        <div className="mit-picker-list">
          {filtered.length === 0 ? (
            <div className="schedule-modal-empty">No incomplete tasks found</div>
          ) : (
            filtered.map((task) => {
              const isSelected = selected.includes(task.id)
              const isDisabled = !isSelected && selected.length >= MAX_MITS
              return (
                <label
                  key={task.id}
                  className={`mit-picker-item ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleTask(task.id)}
                    disabled={isDisabled}
                  />
                  <span className="plan-list-check" />
                  <span className="mit-picker-item-title">{task.title}</span>
                </label>
              )
            })
          )}
        </div>

        <div className="plan-confirm-actions">
          <button className="plan-confirm-cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            className="plan-confirm-accept"
            onClick={() => onSave(selected)}
          >
            Save MITs
          </button>
        </div>
      </div>
    </div>
  )
}
