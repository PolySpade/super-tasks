import { useState, useEffect } from 'react'
import { Smile, Flame, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp } from 'lucide-react'

interface MoodStats {
  weekData: {
    date: string
    dayLabel: string
    rating: number
    completedCount: number
    focusMinutes: number
  }[]
  currentAvg: number | null
  previousAvg: number | null
  trend: 'up' | 'down' | 'same' | null
  latestReflection: string | null
  latestReflectionDate: string | null
  streak: number
  doneToday: boolean
}

interface MoodTrackerProps {
  onStartEODReview?: () => void
}

const MOOD_EMOJIS = ['', '\u{1F629}', '\u{1F614}', '\u{1F610}', '\u{1F60A}', '\u{1F929}']

function getBarColor(rating: number): string {
  if (rating >= 4) return 'var(--success)'
  if (rating === 3) return 'var(--warning)'
  if (rating >= 1) return 'var(--danger)'
  return 'transparent'
}

export function MoodTracker({ onStartEODReview }: MoodTrackerProps) {
  const [stats, setStats] = useState<MoodStats | null>(null)
  const [reflectionExpanded, setReflectionExpanded] = useState(false)
  const [loggedMessage, setLoggedMessage] = useState(false)

  const fetchStats = () => {
    window.api.eodGetMoodStats().then((result: any) => {
      if (result?.success && result.data) {
        setStats(result.data)
      }
    })
  }

  useEffect(() => {
    fetchStats()
  }, [])

  const handleQuickMood = (rating: number) => {
    window.api.eodSaveQuickMood(rating).then((result: any) => {
      if (result?.success) {
        setLoggedMessage(true)
        fetchStats()
        setTimeout(() => setLoggedMessage(false), 2000)
      }
    })
  }

  if (!stats) return null

  const todayStr = new Date().toISOString().split('T')[0]
  const maxBarHeight = 48

  return (
    <div className="mood-tracker">
      <div className="mood-tracker-header">
        <div className="mood-tracker-title">
          <Smile size={14} />
          <span>Mood Tracker</span>
        </div>
        <div className="mood-tracker-meta">
          {stats.streak > 0 && (
            <span className="mood-tracker-streak" title={`${stats.streak}-day streak`}>
              <Flame size={12} />
              {stats.streak}
            </span>
          )}
          {stats.currentAvg !== null && (
            <span className="mood-tracker-avg">
              {stats.trend === 'up' && <TrendingUp size={12} className="mood-trend-up" />}
              {stats.trend === 'down' && <TrendingDown size={12} className="mood-trend-down" />}
              {stats.trend === 'same' && <Minus size={12} />}
              {stats.currentAvg.toFixed(1)}
            </span>
          )}
        </div>
      </div>

      <div className="mood-tracker-chart">
        {stats.weekData.map((day) => {
          const barHeight = day.rating > 0 ? (day.rating / 5) * maxBarHeight : 0
          const isToday = day.date === todayStr
          const dotPosition = day.completedCount > 0
            ? Math.min((day.completedCount / 10) * maxBarHeight, maxBarHeight - 4)
            : -1

          return (
            <div key={day.date} className="mood-tracker-bar-group" title={
              day.rating > 0
                ? `${MOOD_EMOJIS[day.rating]} ${day.rating}/5 \u00B7 ${day.completedCount} tasks \u00B7 ${day.focusMinutes}m focus`
                : 'No data'
            }>
              <div className="mood-tracker-bar-container">
                {day.rating > 0 ? (
                  <div
                    className="mood-tracker-bar"
                    style={{
                      height: `${barHeight}px`,
                      backgroundColor: getBarColor(day.rating)
                    }}
                  />
                ) : (
                  <div className="mood-tracker-bar-empty" />
                )}
                {dotPosition >= 0 && (
                  <div
                    className="mood-tracker-dot"
                    style={{ bottom: `${dotPosition}px` }}
                    title={`${day.completedCount} tasks completed`}
                  />
                )}
              </div>
              <span className={`mood-tracker-day ${isToday ? 'mood-tracker-day-today' : ''}`}>
                {day.dayLabel}
              </span>
            </div>
          )
        })}
      </div>

      {stats.latestReflection && (
        <div className="mood-tracker-reflection">
          <button
            className="mood-tracker-reflection-toggle"
            onClick={() => setReflectionExpanded(!reflectionExpanded)}
          >
            <span className={`mood-tracker-reflection-text ${reflectionExpanded ? '' : 'mood-tracker-reflection-truncated'}`}>
              &ldquo;{stats.latestReflection}&rdquo;
            </span>
            <span className="mood-tracker-reflection-date">
              {stats.latestReflectionDate && new Date(stats.latestReflectionDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              {reflectionExpanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
            </span>
          </button>
        </div>
      )}

      {!stats.doneToday && !loggedMessage && (
        <div className="mood-tracker-quicklog">
          <span className="mood-tracker-quicklog-label">How are you feeling?</span>
          <div className="mood-tracker-quicklog-row">
            <div className="mood-tracker-quicklog-emojis">
              {[1, 2, 3, 4, 5].map((r) => (
                <button
                  key={r}
                  className="mood-tracker-emoji-btn"
                  onClick={() => handleQuickMood(r)}
                  title={`Rate ${r}/5`}
                >
                  {MOOD_EMOJIS[r]}
                </button>
              ))}
            </div>
            {onStartEODReview && (
              <button className="mood-tracker-full-review" onClick={onStartEODReview}>
                Full review
              </button>
            )}
          </div>
        </div>
      )}

      {loggedMessage && (
        <div className="mood-tracker-logged">
          Mood logged!
        </div>
      )}
    </div>
  )
}
