interface PlanConfirmProps {
  blockCount: number
  onConfirm: () => void
  onCancel: () => void
}

export function PlanConfirm({ blockCount, onConfirm, onCancel }: PlanConfirmProps) {
  return (
    <div className="plan-confirm-overlay">
      <div className="plan-confirm-card">
        <p className="plan-confirm-text">
          Create <strong>{blockCount}</strong> event{blockCount !== 1 ? 's' : ''} on your calendar?
        </p>
        <div className="plan-confirm-actions">
          <button className="plan-confirm-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button className="plan-confirm-accept" onClick={onConfirm}>
            Create Events
          </button>
        </div>
      </div>
    </div>
  )
}
