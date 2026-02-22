import { useState, useEffect } from 'react'

interface NudgeConfig {
  blockReminders: boolean
  mitReminders: boolean
  breakOverrun: boolean
  progressCelebration: boolean
  quietHoursStart: string
  quietHoursEnd: string
}

export function NudgeSettings() {
  const [config, setConfig] = useState<NudgeConfig>({
    blockReminders: true,
    mitReminders: true,
    breakOverrun: true,
    progressCelebration: true,
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00'
  })

  useEffect(() => {
    window.api.getNudgeConfig().then((result) => {
      if (result.success && result.data) {
        setConfig(result.data)
      }
    })
  }, [])

  const update = (partial: Partial<NudgeConfig>) => {
    setConfig((prev) => ({ ...prev, ...partial }))
    window.api.setNudgeConfig(partial)
  }

  return (
    <>
      <div className="settings-item">
        <span>Block reminders</span>
        <label className="toggle">
          <input
            type="checkbox"
            checked={config.blockReminders}
            onChange={() => update({ blockReminders: !config.blockReminders })}
          />
          <span className="toggle-slider" />
        </label>
      </div>

      <div className="settings-item">
        <span>MIT reminders</span>
        <label className="toggle">
          <input
            type="checkbox"
            checked={config.mitReminders}
            onChange={() => update({ mitReminders: !config.mitReminders })}
          />
          <span className="toggle-slider" />
        </label>
      </div>

      <div className="settings-item">
        <span>Break overrun alerts</span>
        <label className="toggle">
          <input
            type="checkbox"
            checked={config.breakOverrun}
            onChange={() => update({ breakOverrun: !config.breakOverrun })}
          />
          <span className="toggle-slider" />
        </label>
      </div>

      <div className="settings-item">
        <span>Progress celebrations</span>
        <label className="toggle">
          <input
            type="checkbox"
            checked={config.progressCelebration}
            onChange={() => update({ progressCelebration: !config.progressCelebration })}
          />
          <span className="toggle-slider" />
        </label>
      </div>

      <div className="settings-item">
        <span>Quiet hours</span>
        <div className="settings-hours-row">
          <input
            type="time"
            className="settings-time-input"
            value={config.quietHoursStart}
            onChange={(e) => update({ quietHoursStart: e.target.value })}
          />
          <span className="settings-hours-sep">-</span>
          <input
            type="time"
            className="settings-time-input"
            value={config.quietHoursEnd}
            onChange={(e) => update({ quietHoursEnd: e.target.value })}
          />
        </div>
      </div>
    </>
  )
}
