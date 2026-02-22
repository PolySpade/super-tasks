import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

interface HabitFormModalProps {
  taskLists: { id: string; title: string }[]
  onClose: () => void
  onSubmit: (habit: {
    title: string
    recurrence: string
    customDays?: number[]
    monthDay?: number
    taskListId: string
    energyLevel?: 'high' | 'medium' | 'low'
    timeBoxMinutes?: number
  }) => void
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function HabitFormModal({ taskLists, onClose, onSubmit }: HabitFormModalProps) {
  const [title, setTitle] = useState('')
  const [recurrence, setRecurrence] = useState('daily')
  const [customDays, setCustomDays] = useState<number[]>([1, 2, 3, 4, 5])
  const [monthDay, setMonthDay] = useState(1)
  const [listId, setListId] = useState(taskLists[0]?.id || '')
  const [energy, setEnergy] = useState<string>('')
  const [timeBox, setTimeBox] = useState(0)

  const toggleDay = (day: number) => {
    setCustomDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    )
  }

  const handleSubmit = () => {
    if (!title.trim() || !listId) return
    onSubmit({
      title: title.trim(),
      recurrence,
      customDays: recurrence === 'custom' ? customDays : undefined,
      monthDay: recurrence === 'monthly' ? monthDay : undefined,
      taskListId: listId,
      energyLevel: energy ? (energy as 'high' | 'medium' | 'low') : undefined,
      timeBoxMinutes: timeBox > 0 ? timeBox : undefined
    })
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">New Habit</span>
          <button className="icon-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          <div className="modal-field">
            <label>Title</label>
            <input
              type="text"
              className="settings-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Morning meditation"
              autoFocus
            />
          </div>

          <div className="modal-field">
            <label>Recurrence</label>
            <select
              className="settings-select"
              value={recurrence}
              onChange={(e) => setRecurrence(e.target.value)}
            >
              <option value="daily">Daily</option>
              <option value="weekdays">Weekdays</option>
              <option value="weekly">Weekly</option>
              <option value="custom">Custom Days</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          {recurrence === 'custom' && (
            <div className="modal-field">
              <label>Days</label>
              <div className="habit-day-picker">
                {DAY_LABELS.map((label, i) => (
                  <button
                    key={i}
                    className={`habit-day-btn ${customDays.includes(i) ? 'active' : ''}`}
                    onClick={() => toggleDay(i)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {recurrence === 'monthly' && (
            <div className="modal-field">
              <label>Day of month</label>
              <select
                className="settings-select"
                value={monthDay}
                onChange={(e) => setMonthDay(Number(e.target.value))}
              >
                {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          )}

          <div className="modal-field">
            <label>Task list</label>
            <select
              className="settings-select"
              value={listId}
              onChange={(e) => setListId(e.target.value)}
            >
              {taskLists.map((list) => (
                <option key={list.id} value={list.id}>{list.title}</option>
              ))}
            </select>
          </div>

          <div className="modal-field">
            <label>Energy level</label>
            <div className="task-detail-energy">
              {[
                { label: 'High', value: 'high', color: 'var(--danger)' },
                { label: 'Med', value: 'medium', color: 'var(--warning)' },
                { label: 'Low', value: 'low', color: 'var(--success)' }
              ].map((opt) => (
                <button
                  key={opt.value}
                  className={`energy-option ${energy === opt.value ? 'active' : ''}`}
                  style={{
                    '--energy-color': opt.color,
                    borderColor: energy === opt.value ? opt.color : undefined,
                    color: energy === opt.value ? opt.color : undefined
                  } as React.CSSProperties}
                  onClick={() => setEnergy(energy === opt.value ? '' : opt.value)}
                >
                  <span className="energy-option-dot" style={{ background: opt.color }} />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="modal-field">
            <label>Time box</label>
            <select
              className="settings-select"
              value={timeBox}
              onChange={(e) => setTimeBox(Number(e.target.value))}
            >
              <option value={0}>None</option>
              <option value={15}>15 min</option>
              <option value={30}>30 min</option>
              <option value={45}>45 min</option>
              <option value={60}>60 min</option>
            </select>
          </div>
        </div>

        <div className="modal-footer">
          <button
            className="plan-generate-btn"
            onClick={handleSubmit}
            disabled={!title.trim() || !listId}
          >
            Create Habit
          </button>
        </div>
      </div>
    </div>
  )
}
