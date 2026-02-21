import { useState, useEffect } from 'react'
import { X, Trash2 } from 'lucide-react'

// Google Calendar event colors (colorId 1-11)
const GCAL_EVENT_COLORS: { id: string; hex: string; label: string }[] = [
  { id: '1', hex: '#a4bdfc', label: 'Lavender' },
  { id: '2', hex: '#7ae7bf', label: 'Sage' },
  { id: '3', hex: '#dbadff', label: 'Grape' },
  { id: '4', hex: '#ff887c', label: 'Flamingo' },
  { id: '5', hex: '#fbd75b', label: 'Banana' },
  { id: '6', hex: '#ffb878', label: 'Tangerine' },
  { id: '7', hex: '#46d6db', label: 'Peacock' },
  { id: '8', hex: '#e1e1e1', label: 'Graphite' },
  { id: '9', hex: '#5484ed', label: 'Blueberry' },
  { id: '10', hex: '#51b749', label: 'Basil' },
  { id: '11', hex: '#dc2127', label: 'Tomato' }
]

interface EventEditModalProps {
  eventId: string
  calendarId: string
  summary: string
  start: string
  end: string
  description?: string
  colorId?: string
  onClose: () => void
  onSaved: () => void
  onDeleted: () => void
}

function toTimeInput(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function toDateInput(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function EventEditModal({
  eventId,
  calendarId,
  summary,
  start,
  end,
  description,
  colorId: initialColorId,
  onClose,
  onSaved,
  onDeleted
}: EventEditModalProps) {
  const [name, setName] = useState(summary)
  const [date, setDate] = useState(toDateInput(start))
  const [startTime, setStartTime] = useState(toTimeInput(start))
  const [endTime, setEndTime] = useState(toTimeInput(end))
  const [desc, setDesc] = useState(description || '')
  const [selectedColorId, setSelectedColorId] = useState(initialColorId || '')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('Event name is required')
      return
    }
    if (!startTime || !endTime) {
      setError('Start and end times are required')
      return
    }
    if (endTime <= startTime) {
      setError('End time must be after start time')
      return
    }

    setSaving(true)
    try {
      const newStart = `${date}T${startTime}:00`
      const newEnd = `${date}T${endTime}:00`

      const result = await window.api.updateCalendarEvent(calendarId, eventId, {
        summary: name.trim(),
        start: new Date(newStart).toISOString(),
        end: new Date(newEnd).toISOString(),
        description: desc || undefined,
        colorId: selectedColorId !== (initialColorId || '') ? selectedColorId : undefined
      })

      if (result.success) {
        onSaved()
      } else {
        setError(result.error || 'Failed to update event')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update event')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    setError('')
    try {
      const result = await window.api.deleteCalendarEvent(calendarId, eventId)
      if (result.success) {
        onDeleted()
      } else {
        setError(result.error || 'Failed to delete event')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete event')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="plan-confirm-overlay" onClick={onClose}>
      <div
        className="plan-confirm-card block-form-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="block-form-header">
          <span>Edit Event</span>
          <button className="icon-btn" onClick={onClose}>
            <X size={14} />
          </button>
        </div>
        <form className="block-form-fields" onSubmit={handleSubmit}>
          <div className="block-form-field">
            <label>Name</label>
            <input
              className="block-form-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="block-form-field">
            <label>Date</label>
            <input
              className="block-form-time"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="block-form-time-row">
            <div className="block-form-field">
              <label>Start</label>
              <input
                className="block-form-time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="block-form-field">
              <label>End</label>
              <input
                className="block-form-time"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>
          <div className="block-form-field">
            <label>Description</label>
            <textarea
              className="block-form-input event-edit-desc"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={3}
              placeholder="Optional"
            />
          </div>
          <div className="block-form-field">
            <label>Color</label>
            <div className="color-swatch-row">
              {GCAL_EVENT_COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`color-swatch${selectedColorId === c.id ? ' color-swatch-active' : ''}`}
                  style={{ background: c.hex }}
                  title={c.label}
                  onClick={() => setSelectedColorId(c.id)}
                />
              ))}
            </div>
          </div>
          {error && <div className="block-form-error">{error}</div>}
          <div className="plan-confirm-actions">
            <button
              type="button"
              className="event-edit-delete-btn"
              onClick={handleDelete}
              disabled={deleting || saving}
              title="Delete event"
            >
              <Trash2 size={14} />
            </button>
            <div style={{ flex: 1 }} />
            <button type="button" className="plan-confirm-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="plan-confirm-accept" disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
