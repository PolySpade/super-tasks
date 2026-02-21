import { EnergyLevel } from '../types'

const colors: Record<EnergyLevel, string> = {
  high: 'var(--danger)',
  medium: 'var(--warning)',
  low: 'var(--success)'
}

export function EnergyBadge({ level }: { level: EnergyLevel }) {
  return (
    <span
      className="energy-badge"
      title={`${level} energy`}
      style={{ background: colors[level] }}
    />
  )
}
