import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

interface BlockFormData {
  blockName: string
  start: string
  end: string
}

interface BlockFormModalProps {
  onClose: () => void
  onSubmit: (data: BlockFormData) => void
  initial?: BlockFormData
}

export function BlockFormModal({ onClose, onSubmit, initial }: BlockFormModalProps) {
  const [blockName, setBlockName] = useState(initial?.blockName || '')
  const [start, setStart] = useState(initial?.start || '')
  const [end, setEnd] = useState(initial?.end || '')
  const [error, setError] = useState('')

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!blockName.trim()) {
      setError('Block name is required')
      return
    }
    if (!start || !end) {
      setError('Start and end times are required')
      return
    }
    if (end <= start) {
      setError('End time must be after start time')
      return
    }

    onSubmit({ blockName: blockName.trim(), start, end })
  }

  return (
    <div className="plan-confirm-overlay" onClick={onClose}>
      <div
        className="plan-confirm-card block-form-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="block-form-header">
          <span>{initial ? 'Edit Block' : 'Add Block'}</span>
          <button className="icon-btn" onClick={onClose}>
            <X size={14} />
          </button>
        </div>
        <form className="block-form-fields" onSubmit={handleSubmit}>
          <div className="block-form-field">
            <label>Block Name</label>
            <input
              className="block-form-input"
              type="text"
              value={blockName}
              onChange={(e) => setBlockName(e.target.value)}
              placeholder="e.g. Lunch, Gym, Reading"
              autoFocus
            />
          </div>
          <div className="block-form-time-row">
            <div className="block-form-field">
              <label>Start</label>
              <input
                className="block-form-time"
                type="time"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </div>
            <div className="block-form-field">
              <label>End</label>
              <input
                className="block-form-time"
                type="time"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </div>
          </div>
          {error && <div className="block-form-error">{error}</div>}
          <div className="plan-confirm-actions">
            <button type="button" className="plan-confirm-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="plan-confirm-accept">
              {initial ? 'Save' : 'Add Block'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
