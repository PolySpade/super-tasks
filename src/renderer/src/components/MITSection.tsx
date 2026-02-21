import { useState } from 'react'
import { Star, Plus, X, Bug } from 'lucide-react'
import { Task } from '../types'
import { MITPicker } from './MITPicker'

interface MITSectionProps {
  mits: string[]
  allTasks: Task[]
  onSetMITs: (taskIds: string[]) => void
  onSelectTask: (task: Task) => void
}

function findTask(tasks: Task[], id: string): Task | undefined {
  for (const t of tasks) {
    if (t.id === id) return t
    if (t.children) {
      const found = findTask(t.children, id)
      if (found) return found
    }
  }
  return undefined
}

export function MITSection({ mits, allTasks, onSetMITs, onSelectTask }: MITSectionProps) {
  const [showPicker, setShowPicker] = useState(false)

  const mitTasks = mits
    .map((id) => findTask(allTasks, id))
    .filter((t): t is Task => t !== undefined && t.status !== 'completed')

  const handleRemove = (taskId: string) => {
    onSetMITs(mits.filter((id) => id !== taskId))
  }

  return (
    <div className="mit-section">
      <div className="mit-header">
        <Star size={14} className="mit-icon" />
        <span className="mit-label">Most Important Tasks</span>
        <button className="mit-pick-btn" onClick={() => setShowPicker(true)}>
          <Plus size={12} />
          Pick MITs
        </button>
      </div>

      {mitTasks.length === 0 ? (
        <div className="mit-empty">
          No MITs set for today. Pick up to 3 tasks to focus on.
        </div>
      ) : (
        <div className="mit-list">
          {mitTasks.map((task, i) => (
            <div
              key={task.id}
              className="mit-item"
              onClick={() => onSelectTask(task)}
            >
              {i === 0 && (
                <span className="mit-frog" title="Eat the Frog — do this first!">
                  <Bug size={14} />
                </span>
              )}
              {i > 0 && <span className="mit-number">#{i + 1}</span>}
              <span className="mit-item-title">{task.title}</span>
              <button
                className="icon-btn mit-remove-btn"
                onClick={(e) => {
                  e.stopPropagation()
                  handleRemove(task.id)
                }}
                title="Remove MIT"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {showPicker && (
        <MITPicker
          allTasks={allTasks}
          currentMITs={mits}
          onSave={(ids) => {
            onSetMITs(ids)
            setShowPicker(false)
          }}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  )
}
