import { Loader2, CheckCircle2 } from 'lucide-react'
import { Task, EnergyLevel, TaskMetadata } from '../types'
import { TaskItem } from './TaskItem'

interface TaskListProps {
  tasks: Task[]
  loading: boolean
  onToggle: (taskId: string, completed: boolean) => void
  onDelete: (taskId: string) => void
  onSelectTask: (task: Task) => void
  onAddSubtask: (parentId: string) => void
  onFocusStart?: (task: Task) => void
  mits?: string[]
  onToggleMIT?: (taskId: string) => void
  metadataMap?: Record<string, TaskMetadata>
  onSchedule?: (task: Task) => void
}

export function TaskList({
  tasks,
  loading,
  onToggle,
  onDelete,
  onSelectTask,
  onAddSubtask,
  onFocusStart,
  mits,
  onToggleMIT,
  metadataMap,
  onSchedule
}: TaskListProps) {
  if (loading) {
    return (
      <div className="task-list-empty">
        <Loader2 size={24} className="spin" />
      </div>
    )
  }

  if (tasks.length === 0) {
    return (
      <div className="task-list-empty">
        <div className="empty-state">
          <CheckCircle2 size={32} strokeWidth={1.5} />
          <p>No tasks yet</p>
          <span>Add a task below to get started</span>
        </div>
      </div>
    )
  }

  const incomplete = tasks.filter((t) => t.status !== 'completed')
  const completed = tasks.filter((t) => t.status === 'completed')

  return (
    <div className="task-list">
      {incomplete.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          onToggle={onToggle}
          onDelete={onDelete}
          onSelect={onSelectTask}
          onAddSubtask={onAddSubtask}
          onFocusStart={onFocusStart}
          isMIT={mits?.includes(task.id)}
          onToggleMIT={onToggleMIT}
          timeBoxMinutes={metadataMap?.[task.id]?.timeBoxMinutes}
          energyLevel={metadataMap?.[task.id]?.energyLevel}
          onSchedule={onSchedule}
        />
      ))}
      {completed.length > 0 && (
        <>
          <div className="completed-divider">
            <span>Completed ({completed.length})</span>
          </div>
          {completed.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              onToggle={onToggle}
              onDelete={onDelete}
              onSelect={onSelectTask}
              onAddSubtask={onAddSubtask}
            />
          ))}
        </>
      )}
    </div>
  )
}
