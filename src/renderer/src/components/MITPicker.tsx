import { useState, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Search, Star } from 'lucide-react'
import { Task, TaskList } from '../types'

interface MITPickerProps {
  taskLists: TaskList[]
  currentMITs: string[]
  onSave: (taskIds: string[]) => void
  onClose: () => void
}

const MAX_MITS = 3

export function MITPicker({ taskLists, currentMITs, onSave, onClose }: MITPickerProps) {
  const [selected, setSelected] = useState<string[]>([...currentMITs])
  const [search, setSearch] = useState('')
  const [activeListId, setActiveListId] = useState<string>('all')
  const [tasksByList, setTasksByList] = useState<Record<string, Task[]>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const result: Record<string, Task[]> = {}
      for (const list of taskLists) {
        const res = await window.api.getTasks(list.id)
        if (cancelled) return
        if (res.success && res.data) {
          result[list.id] = res.data
        }
      }
      setTasksByList(result)
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [taskLists])

  const incompleteTasks = useMemo(() => {
    const flat: { task: Task; listId: string; listTitle: string }[] = []
    const flatten = (tasks: Task[], listId: string, listTitle: string): void => {
      for (const t of tasks) {
        if (t.status === 'needsAction') flat.push({ task: t, listId, listTitle })
        if (t.children) flatten(t.children, listId, listTitle)
      }
    }
    for (const list of taskLists) {
      const tasks = tasksByList[list.id]
      if (tasks) flatten(tasks, list.id, list.title)
    }
    return flat
  }, [tasksByList, taskLists])

  const filtered = useMemo(() => {
    let items = incompleteTasks
    if (activeListId !== 'all') {
      items = items.filter((i) => i.listId === activeListId)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      items = items.filter(
        (i) => i.task.title.toLowerCase().includes(q) || (i.task.notes && i.task.notes.toLowerCase().includes(q))
      )
    }
    return items
  }, [incompleteTasks, search, activeListId])

  const toggleTask = (taskId: string) => {
    if (selected.includes(taskId)) {
      setSelected(selected.filter((id) => id !== taskId))
    } else if (selected.length < MAX_MITS) {
      setSelected([...selected, taskId])
    }
  }

  return createPortal(
    <div className="plan-confirm-overlay mit-picker-overlay" onClick={onClose}>
      <div className="plan-confirm-card mit-picker" onClick={(e) => e.stopPropagation()}>
        <div className="mit-picker-header">
          <Star size={14} />
          <h3>Pick MITs ({selected.length}/{MAX_MITS})</h3>
        </div>

        <div className="mit-picker-tabs">
          <button
            className={`mit-picker-tab ${activeListId === 'all' ? 'active' : ''}`}
            onClick={() => setActiveListId('all')}
          >
            All Lists
          </button>
          {taskLists.map((list) => (
            <button
              key={list.id}
              className={`mit-picker-tab ${activeListId === list.id ? 'active' : ''}`}
              onClick={() => setActiveListId(list.id)}
            >
              {list.title}
            </button>
          ))}
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
          {loading ? (
            <div className="schedule-modal-empty"><div className="spinner" /></div>
          ) : filtered.length === 0 ? (
            <div className="schedule-modal-empty">No incomplete tasks found</div>
          ) : (
            filtered.map((item) => {
              const isSelected = selected.includes(item.task.id)
              const isDisabled = !isSelected && selected.length >= MAX_MITS
              return (
                <label
                  key={item.task.id}
                  className={`mit-picker-item ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleTask(item.task.id)}
                    disabled={isDisabled}
                  />
                  <span className="plan-list-check" />
                  <span className="mit-picker-item-title">{item.task.title}</span>
                  {activeListId === 'all' && (
                    <span className="mit-picker-item-list">{item.listTitle}</span>
                  )}
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
    </div>,
    document.body
  )
}
