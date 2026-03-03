import { useState, useRef, useEffect } from 'react'
import { RefreshCw, Minimize2, Plus, Trash2, X, Grid2x2 } from 'lucide-react'
import { TaskList } from '../types'

interface TaskListSelectorProps {
  taskLists: TaskList[]
  selectedListId: string
  onSelect: (id: string) => void
  onRefresh: () => void
  taskCount: { total: number; completed: number }
  isOffline?: boolean
  onMinimize?: () => void
  onToggleGrid?: () => void
  onCreateList?: (title: string) => Promise<void>
  onDeleteList?: (listId: string) => Promise<void>
}

export function TaskListSelector({
  taskLists,
  selectedListId,
  onSelect,
  onRefresh,
  taskCount,
  isOffline,
  onMinimize,
  onToggleGrid,
  onCreateList,
  onDeleteList
}: TaskListSelectorProps) {
  const [offlineMsg, setOfflineMsg] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [newListTitle, setNewListTitle] = useState('')
  const [creating, setCreating] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (showCreate && inputRef.current) {
      inputRef.current.focus()
    }
  }, [showCreate])

  const handleRefresh = () => {
    if (isOffline) {
      setOfflineMsg(true)
      setTimeout(() => setOfflineMsg(false), 2000)
      return
    }
    onRefresh()
  }

  const handleCreate = async () => {
    const title = newListTitle.trim()
    if (!title || !onCreateList) return
    setCreating(true)
    try {
      await onCreateList(title)
      setNewListTitle('')
      setShowCreate(false)
    } finally {
      setCreating(false)
    }
  }

  const handleCreateKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleCreate()
    } else if (e.key === 'Escape') {
      setShowCreate(false)
      setNewListTitle('')
    }
  }

  const handleDelete = async () => {
    if (!onDeleteList || !selectedListId) return
    setDeleting(true)
    try {
      await onDeleteList(selectedListId)
      setShowDeleteConfirm(false)
    } finally {
      setDeleting(false)
    }
  }

  const selectedListTitle = taskLists.find((l) => l.id === selectedListId)?.title || ''

  return (
    <div className="task-list-selector">
      <div className="selector-row">
        <select
          value={selectedListId}
          onChange={(e) => onSelect(e.target.value)}
        >
          {taskLists.map((list) => (
            <option key={list.id} value={list.id}>
              {list.title}
            </option>
          ))}
        </select>
        {onCreateList && (
          <button
            className="icon-btn"
            onClick={() => setShowCreate(!showCreate)}
            title="New list"
          >
            {showCreate ? <X size={14} /> : <Plus size={14} />}
          </button>
        )}
        {onDeleteList && taskLists.length > 1 && (
          <button
            className="icon-btn"
            onClick={() => setShowDeleteConfirm(true)}
            title="Delete list"
          >
            <Trash2 size={14} />
          </button>
        )}
        <button className="icon-btn" onClick={handleRefresh} title="Refresh">
          <RefreshCw size={14} />
        </button>
        {onToggleGrid && (
          <button className="icon-btn" onClick={onToggleGrid} title="All boards">
            <Grid2x2 size={14} />
          </button>
        )}
        {onMinimize && (
          <button className="icon-btn" onClick={onMinimize} title="Compact view">
            <Minimize2 size={14} />
          </button>
        )}
      </div>

      {showCreate && (
        <div className="selector-create-row">
          <input
            ref={inputRef}
            type="text"
            value={newListTitle}
            onChange={(e) => setNewListTitle(e.target.value)}
            onKeyDown={handleCreateKeyDown}
            placeholder="New list name..."
            className="selector-create-input"
            disabled={creating}
          />
          <button
            className="selector-create-btn"
            onClick={handleCreate}
            disabled={!newListTitle.trim() || creating}
          >
            {creating ? '...' : 'Add'}
          </button>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="selector-delete-confirm">
          <span className="selector-delete-msg">
            Delete "{selectedListTitle}"?
          </span>
          <div className="selector-delete-actions">
            <button
              className="selector-delete-cancel"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={deleting}
            >
              Cancel
            </button>
            <button
              className="selector-delete-btn"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? '...' : 'Delete'}
            </button>
          </div>
        </div>
      )}

      {offlineMsg ? (
        <div className="task-summary" style={{ color: '#f44336' }}>
          You are in offline mode
        </div>
      ) : !showCreate && !showDeleteConfirm ? (
        <div className="task-summary">
          <span>{taskCount.total - taskCount.completed} remaining</span>
          <span className="dot">·</span>
          <span>{taskCount.completed} done</span>
        </div>
      ) : null}
    </div>
  )
}
