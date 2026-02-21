import { useState } from 'react'
import { X, Trash2, ArrowRight } from 'lucide-react'

interface BulkActionBarProps {
  count: number
  onDelete: () => void
  onMove: (targetDate: string) => void
  onClear: () => void
}

export function BulkActionBar({ count, onDelete, onMove, onClear }: BulkActionBarProps) {
  const [confirming, setConfirming] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)

  const handleDeleteClick = () => {
    if (confirming) {
      onDelete()
      setConfirming(false)
    } else {
      setConfirming(true)
    }
  }

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value
    if (date) {
      onMove(date)
      setShowDatePicker(false)
    }
  }

  return (
    <div className="bulk-action-bar">
      <div className="bulk-action-left">
        <span className="bulk-action-count">{count} selected</span>
        <button className="bulk-action-clear" onClick={onClear}>
          <X size={14} />
          Clear
        </button>
      </div>
      <div className="bulk-action-right">
        {showDatePicker ? (
          <input
            type="date"
            className="bulk-action-date"
            autoFocus
            onChange={handleDateChange}
            onBlur={() => setShowDatePicker(false)}
          />
        ) : (
          <button className="bulk-action-move" onClick={() => setShowDatePicker(true)}>
            <ArrowRight size={14} />
            Move to…
          </button>
        )}
        <button
          className={`bulk-action-delete ${confirming ? 'bulk-action-confirm' : ''}`}
          onClick={handleDeleteClick}
          onBlur={() => setConfirming(false)}
        >
          <Trash2 size={14} />
          {confirming ? 'Confirm?' : 'Delete'}
        </button>
      </div>
    </div>
  )
}
