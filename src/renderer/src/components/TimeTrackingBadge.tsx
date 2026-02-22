import { Clock, TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface TimeTrackingBadgeProps {
  estimatedMinutes?: number
  actualMinutes: number
  sessionCount: number
}

export function TimeTrackingBadge({ estimatedMinutes, actualMinutes, sessionCount }: TimeTrackingBadgeProps) {
  const hasEstimate = estimatedMinutes && estimatedMinutes > 0
  const ratio = hasEstimate ? actualMinutes / estimatedMinutes : null

  let statusColor = 'var(--text-muted)'
  let StatusIcon = Minus
  let statusLabel = ''

  if (ratio !== null) {
    if (ratio <= 1.1) {
      statusColor = 'var(--success)'
      StatusIcon = TrendingDown
      statusLabel = 'On track'
    } else if (ratio <= 1.5) {
      statusColor = 'var(--warning)'
      StatusIcon = TrendingUp
      statusLabel = 'Over estimate'
    } else {
      statusColor = 'var(--danger)'
      StatusIcon = TrendingUp
      statusLabel = 'Significantly over'
    }
  }

  const formatMin = (m: number) => {
    if (m >= 60) {
      const h = Math.floor(m / 60)
      const rem = m % 60
      return rem > 0 ? `${h}h ${rem}m` : `${h}h`
    }
    return `${m}m`
  }

  return (
    <div className="time-tracking-badge">
      <Clock size={13} />
      <div className="time-tracking-info">
        {hasEstimate ? (
          <>
            <span className="time-tracking-label">
              Est: {formatMin(estimatedMinutes)} | Act: {formatMin(actualMinutes)}
            </span>
            <div className="time-tracking-bar">
              <div
                className="time-tracking-bar-fill"
                style={{
                  width: `${Math.min((actualMinutes / estimatedMinutes) * 100, 100)}%`,
                  backgroundColor: statusColor
                }}
              />
              {actualMinutes > estimatedMinutes && (
                <div
                  className="time-tracking-bar-over"
                  style={{
                    width: `${Math.min(((actualMinutes - estimatedMinutes) / estimatedMinutes) * 100, 50)}%`,
                    backgroundColor: statusColor,
                    opacity: 0.5
                  }}
                />
              )}
            </div>
            <span className="time-tracking-status" style={{ color: statusColor }}>
              <StatusIcon size={10} />
              {statusLabel}
            </span>
          </>
        ) : (
          <span className="time-tracking-label">
            {formatMin(actualMinutes)} tracked ({sessionCount} session{sessionCount !== 1 ? 's' : ''})
          </span>
        )}
      </div>
    </div>
  )
}
