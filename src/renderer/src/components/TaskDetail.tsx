import { useState, useEffect } from 'react'
import { ArrowLeft, Calendar, Trash2, X, Save, Timer, Clock, Zap } from 'lucide-react'
import { Task, EnergyLevel, TaskMetadata } from '../types'
import { TimeTrackingBadge } from './TimeTrackingBadge'

const TIME_BOX_OPTIONS = [
  { label: 'None', value: 0 },
  { label: '15 min', value: 15 },
  { label: '30 min', value: 30 },
  { label: '45 min', value: 45 },
  { label: '60 min', value: 60 },
  { label: '90 min', value: 90 }
]

const ENERGY_OPTIONS: { label: string; value: EnergyLevel; color: string }[] = [
  { label: 'High', value: 'high', color: 'var(--danger)' },
  { label: 'Med', value: 'medium', color: 'var(--warning)' },
  { label: 'Low', value: 'low', color: 'var(--success)' }
]

interface TaskDetailProps {
  task: Task
  onBack: () => void
  onUpdate: (taskId: string, updates: { title?: string; notes?: string; due?: string | null }) => void
  onDelete: (taskId: string) => void
  onToggle: (taskId: string, completed: boolean) => void
  onFocusStart?: (task: Task) => void
  metadata?: TaskMetadata
  onSetMetadata?: (taskId: string, partial: Partial<TaskMetadata>) => void
}

export function TaskDetail({ task, onBack, onUpdate, onDelete, onToggle, onFocusStart, metadata, onSetMetadata }: TaskDetailProps) {
  const [title, setTitle] = useState(task.title)
  const [notes, setNotes] = useState(task.notes || '')
  const [due, setDue] = useState(task.due ? task.due.split('T')[0] : '')
  const [timeBox, setTimeBox] = useState(metadata?.timeBoxMinutes || 0)
  const [energy, setEnergy] = useState<EnergyLevel | undefined>(metadata?.energyLevel)
  const [trackingData, setTrackingData] = useState<{ totalMinutes: number; sessionCount: number } | null>(null)
  const isCompleted = task.status === 'completed'

  useEffect(() => {
    setTitle(task.title)
    setNotes(task.notes || '')
    setDue(task.due ? task.due.split('T')[0] : '')
    setTimeBox(metadata?.timeBoxMinutes || 0)
    setEnergy(metadata?.energyLevel)

    // Load time tracking data
    window.api.getTimeTracking(task.id).then((result) => {
      if (result.success && result.data) {
        setTrackingData({ totalMinutes: result.data.totalMinutes, sessionCount: result.data.sessionCount })
      } else {
        setTrackingData(null)
      }
    })
  }, [task.id])

  const hasChanges =
    title !== task.title ||
    notes !== (task.notes || '') ||
    due !== (task.due ? task.due.split('T')[0] : '')

  const handleSave = () => {
    const updates: { title?: string; notes?: string; due?: string | null } = {}
    if (title !== task.title) updates.title = title
    if (notes !== (task.notes || '')) updates.notes = notes
    if (due !== (task.due ? task.due.split('T')[0] : '')) {
      updates.due = due || null
    }
    if (Object.keys(updates).length > 0) {
      onUpdate(task.id, updates)
    }
    onBack()
  }

  const handleDelete = () => {
    onDelete(task.id)
    onBack()
  }

  const handleTimeBoxChange = (value: number) => {
    setTimeBox(value)
    onSetMetadata?.(task.id, { timeBoxMinutes: value || undefined })
  }

  const handleEnergyChange = (value: EnergyLevel) => {
    const newVal = energy === value ? undefined : value
    setEnergy(newVal)
    onSetMetadata?.(task.id, { energyLevel: newVal })
  }

  return (
    <div className="task-detail">
      <div className="task-detail-header">
        <button className="icon-btn" onClick={onBack} title="Back">
          <ArrowLeft size={16} />
        </button>
        <div className="task-detail-actions">
          {hasChanges && (
            <button className="icon-btn save-btn" onClick={handleSave} title="Save changes">
              <Save size={14} />
            </button>
          )}
          <button className="icon-btn" onClick={handleDelete} title="Delete task">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="task-detail-body">
        <div className="task-detail-status">
          <label className="task-checkbox">
            <input
              type="checkbox"
              checked={isCompleted}
              onChange={() => onToggle(task.id, !isCompleted)}
            />
            <span className="checkmark" />
          </label>
          <input
            className="task-detail-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title"
          />
        </div>

        <div className="task-detail-field">
          <label>
            <Calendar size={13} />
            Due date
          </label>
          <div className="task-detail-date">
            <input
              type="date"
              value={due}
              onChange={(e) => setDue(e.target.value)}
            />
            {due && (
              <button
                className="icon-btn"
                onClick={() => setDue('')}
                title="Clear date"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        <div className="task-detail-field">
          <label>
            <Clock size={13} />
            Time Box
          </label>
          <div className="task-detail-timebox">
            {TIME_BOX_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className={`timebox-option ${timeBox === opt.value ? 'active' : ''}`}
                onClick={() => handleTimeBoxChange(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="task-detail-field">
          <label>
            <Zap size={13} />
            Energy Level
          </label>
          <div className="task-detail-energy">
            {ENERGY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className={`energy-option ${energy === opt.value ? 'active' : ''}`}
                style={{
                  '--energy-color': opt.color,
                  borderColor: energy === opt.value ? opt.color : undefined,
                  color: energy === opt.value ? opt.color : undefined
                } as React.CSSProperties}
                onClick={() => handleEnergyChange(opt.value)}
              >
                <span className="energy-option-dot" style={{ background: opt.color }} />
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {trackingData && trackingData.totalMinutes > 0 && (
          <div className="task-detail-field">
            <label>
              <Clock size={13} />
              Time Tracked
            </label>
            <TimeTrackingBadge
              estimatedMinutes={metadata?.timeBoxMinutes}
              actualMinutes={trackingData.totalMinutes}
              sessionCount={trackingData.sessionCount}
            />
          </div>
        )}

        <div className="task-detail-field">
          <label>Notes</label>
          <textarea
            className="task-detail-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes..."
            rows={5}
          />
        </div>
      </div>

      <div className="task-detail-footer">
        {hasChanges && (
          <button className="save-changes-btn" onClick={handleSave}>
            Save changes
          </button>
        )}
        {!isCompleted && onFocusStart && (
          <button className="start-focus-btn" onClick={() => onFocusStart(task)}>
            <Timer size={14} />
            {timeBox > 0 ? `Start ${timeBox}min Time Box` : 'Start Focus Session'}
          </button>
        )}
      </div>
    </div>
  )
}
