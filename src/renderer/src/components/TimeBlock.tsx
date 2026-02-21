import { useState } from 'react'
import { X, ChevronDown, ChevronRight, Clock, Pencil } from 'lucide-react'
import { BlockTask } from '../types'

interface TimeBlockProps {
  start: string
  end: string
  title: string
  reason?: string
  type: 'event' | 'task' | 'break' | 'context-block'
  onRemove?: () => void
  tasks?: BlockTask[]
  onRemoveTask?: (taskIndex: number) => void
  onEdit?: () => void
}

export function TimeBlockRow({
  start,
  end,
  title,
  reason,
  type,
  onRemove,
  tasks,
  onRemoveTask,
  onEdit
}: TimeBlockProps) {
  const [expanded, setExpanded] = useState(false)

  const typeClass =
    type === 'event'
      ? 'time-block-event'
      : type === 'context-block'
        ? 'time-block-context'
        : type === 'task'
          ? 'time-block-task'
          : 'time-block-break'

  if (type === 'context-block') {
    const hasTasks = tasks && tasks.length > 0
    return (
      <div className={`time-block ${typeClass}`}>
        <div className="time-block-bar" />
        <div className="time-block-time">
          {start}–{end}
        </div>
        <div className="time-block-content">
          {hasTasks ? (
            <div
              className="time-block-title-row"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <div className="time-block-title">{title}</div>
              <span className="time-block-task-count">{tasks.length}</span>
            </div>
          ) : (
            <div className="time-block-title">{title}</div>
          )}
          {reason && <div className="time-block-reason">{reason}</div>}
          {hasTasks && expanded && (
            <div className="time-block-tasks">
              {tasks.map((task, i) => (
                <div key={task.taskId || i} className="time-block-task-item">
                  <span className="time-block-task-dot" />
                  <span className="time-block-task-name">{task.taskTitle}</span>
                  <span className="time-block-task-est">
                    <Clock size={10} />
                    {task.estimatedMinutes}m
                  </span>
                  {onRemoveTask && (
                    <button
                      className="time-block-task-remove icon-btn"
                      onClick={() => onRemoveTask(i)}
                      title="Remove task"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        {onEdit && (
          <button className="time-block-edit icon-btn" onClick={onEdit} title="Edit block">
            <Pencil size={14} />
          </button>
        )}
        {onRemove && (
          <button className="time-block-remove icon-btn" onClick={onRemove} title="Remove block">
            <X size={14} />
          </button>
        )}
      </div>
    )
  }

  return (
    <div className={`time-block ${typeClass}`}>
      <div className="time-block-bar" />
      <div className="time-block-time">
        {start}–{end}
      </div>
      <div className="time-block-content">
        <div className="time-block-title">{title}</div>
        {reason && <div className="time-block-reason">{reason}</div>}
      </div>
      {onRemove && (
        <button className="time-block-remove icon-btn" onClick={onRemove} title="Remove">
          <X size={14} />
        </button>
      )}
    </div>
  )
}
