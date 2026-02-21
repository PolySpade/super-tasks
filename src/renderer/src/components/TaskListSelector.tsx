import { RefreshCw } from 'lucide-react'
import { TaskList } from '../types'

interface TaskListSelectorProps {
  taskLists: TaskList[]
  selectedListId: string
  onSelect: (id: string) => void
  onRefresh: () => void
  taskCount: { total: number; completed: number }
}

export function TaskListSelector({
  taskLists,
  selectedListId,
  onSelect,
  onRefresh,
  taskCount
}: TaskListSelectorProps) {
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
        <button className="icon-btn" onClick={onRefresh} title="Refresh">
          <RefreshCw size={14} />
        </button>
      </div>
      <div className="task-summary">
        <span>{taskCount.total - taskCount.completed} remaining</span>
        <span className="dot">·</span>
        <span>{taskCount.completed} done</span>
      </div>
    </div>
  )
}
