import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { TaskList } from '../types'

interface TaskListSelectorProps {
  taskLists: TaskList[]
  selectedListId: string
  onSelect: (id: string) => void
  onRefresh: () => void
  taskCount: { total: number; completed: number }
  isOffline?: boolean
}

export function TaskListSelector({
  taskLists,
  selectedListId,
  onSelect,
  onRefresh,
  taskCount,
  isOffline
}: TaskListSelectorProps) {
  const [offlineMsg, setOfflineMsg] = useState(false)

  const handleRefresh = () => {
    if (isOffline) {
      setOfflineMsg(true)
      setTimeout(() => setOfflineMsg(false), 2000)
      return
    }
    onRefresh()
  }

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
        <button className="icon-btn" onClick={handleRefresh} title="Refresh">
          <RefreshCw size={14} />
        </button>
      </div>
      {offlineMsg ? (
        <div className="task-summary" style={{ color: '#f44336' }}>
          You are in offline mode
        </div>
      ) : (
        <div className="task-summary">
          <span>{taskCount.total - taskCount.completed} remaining</span>
          <span className="dot">·</span>
          <span>{taskCount.completed} done</span>
        </div>
      )}
    </div>
  )
}
