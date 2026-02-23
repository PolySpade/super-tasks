import { useState, useRef, useEffect, useMemo } from 'react'
import { Zap, ChevronDown } from 'lucide-react'

interface TaskList {
  id: string
  title: string
}

interface ParsedPreview {
  title: string
  due?: string
  dueLabel?: string
  energyLevel?: 'high' | 'medium' | 'low'
  timeBoxMinutes?: number
}

type EnergyLevel = 'high' | 'medium' | 'low'

function parsePreview(input: string): ParsedPreview {
  let text = input.trim()
  if (!text) return { title: '' }

  let due: string | undefined
  let dueLabel: string | undefined
  let energyLevel: EnergyLevel | undefined
  let timeBoxMinutes: number | undefined

  const today = new Date()

  if (/\btomorrow\b/i.test(text)) {
    const d = new Date(today)
    d.setDate(d.getDate() + 1)
    due = d.toISOString().split('T')[0]
    dueLabel = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    text = text.replace(/\btomorrow\b/i, '').trim()
  }

  if (!due && /\btoday\b/i.test(text)) {
    due = today.toISOString().split('T')[0]
    dueLabel = 'Today'
    text = text.replace(/\btoday\b/i, '').trim()
  }

  if (!due) {
    const dayMatch = text.match(
      /\bnext\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i
    )
    if (dayMatch) {
      const dayNames = [
        'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'
      ]
      const targetDay = dayNames.indexOf(dayMatch[1].toLowerCase())
      const d = new Date(today)
      const diff = (targetDay - d.getDay() + 7) % 7 || 7
      d.setDate(d.getDate() + diff)
      due = d.toISOString().split('T')[0]
      dueLabel = d.toLocaleDateString(undefined, {
        weekday: 'short', month: 'short', day: 'numeric'
      })
      text = text
        .replace(/\bnext\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i, '')
        .trim()
    }
  }

  if (/\bhigh\s*energy\b/i.test(text) || /\bhard\b/i.test(text)) {
    energyLevel = 'high'
    text = text.replace(/\bhigh\s*energy\b/i, '').replace(/\bhard\b/i, '').trim()
  } else if (/\blow\s*energy\b/i.test(text) || /\beasy\b/i.test(text)) {
    energyLevel = 'low'
    text = text.replace(/\blow\s*energy\b/i, '').replace(/\beasy\b/i, '').trim()
  } else if (/\bmedium\s*energy\b/i.test(text)) {
    energyLevel = 'medium'
    text = text.replace(/\bmedium\s*energy\b/i, '').trim()
  }

  const timeMatch = text.match(/\b(\d+)\s*(min|mins|minutes|m|hour|hours|h|hr|hrs)\b/i)
  if (timeMatch) {
    const num = parseInt(timeMatch[1])
    const unit = timeMatch[2].toLowerCase()
    timeBoxMinutes = unit.startsWith('h') ? num * 60 : num
    text = text.replace(timeMatch[0], '').trim()
  }

  text = text.replace(/\s+/g, ' ').replace(/^[\s,\-]+|[\s,\-]+$/g, '').trim()

  return { title: text || input.trim(), due, dueLabel, energyLevel, timeBoxMinutes }
}

function formatTime(minutes: number): string {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return m > 0 ? `${h}h ${m}m` : `${h}h`
  }
  return `${minutes}m`
}

const ENERGY_CONFIG = {
  high: { label: 'High', emoji: '\u26A1' },
  medium: { label: 'Med', emoji: '\uD83D\uDD36' },
  low: { label: 'Low', emoji: '\uD83C\uDF43' }
} as const

const TIME_PRESETS = [15, 30, 45, 60, 90, 120]

const WRAPPER_PADDING = 24 // 12px top + 12px bottom
const COLLAPSED_HEIGHT = 64 + WRAPPER_PADDING
const PREVIEW_HEIGHT = 120 + WRAPPER_PADDING
const DROPDOWN_ITEM_HEIGHT = 30
const DROPDOWN_PADDING = 12
const WINDOW_WIDTH = 500 + WRAPPER_PADDING

type DropdownKind = 'list' | 'time' | 'energy' | null

export function QuickCaptureInput() {
  const [value, setValue] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [lists, setLists] = useState<TaskList[]>([])
  const [selectedListId, setSelectedListId] = useState('')
  const [openDropdown, setOpenDropdown] = useState<DropdownKind>(null)
  const [energyOverride, setEnergyOverride] = useState<EnergyLevel | null>(null)
  const [timeOverride, setTimeOverride] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const lastHeightRef = useRef(COLLAPSED_HEIGHT)
  const listDropdownRef = useRef<HTMLDivElement>(null)
  const timeDropdownRef = useRef<HTMLDivElement>(null)
  const energyDropdownRef = useRef<HTMLDivElement>(null)

  const parsed = useMemo(() => parsePreview(value), [value])
  const hasPreview = value.trim().length > 0
  const selectedList = lists.find((l) => l.id === selectedListId)

  // Effective values: manual override wins, then parsed from text
  const effectiveEnergy = energyOverride ?? parsed.energyLevel
  const effectiveTime = timeOverride ?? parsed.timeBoxMinutes

  // Reset state when window becomes visible again
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        setValue('')
        setSubmitting(false)
        setOpenDropdown(null)
        setEnergyOverride(null)
        setTimeOverride(null)
        lastHeightRef.current = COLLAPSED_HEIGHT
        window.api.setCaptureWindowSize(WINDOW_WIDTH, COLLAPSED_HEIGHT)
        setTimeout(() => inputRef.current?.focus(), 50)
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  // Fetch task lists and default on mount
  useEffect(() => {
    ;(async () => {
      try {
        const [settingsRes, listsRes] = await Promise.all([
          window.api.getPlannerSettings(),
          window.api.getTaskLists()
        ])
        const fetchedLists: TaskList[] = (listsRes.data || []).map((l: any) => ({
          id: l.id,
          title: l.title
        }))
        setLists(fetchedLists)

        const defaultId = settingsRes.data?.quickCaptureDefaultListId
        if (defaultId && fetchedLists.find((l) => l.id === defaultId)) {
          setSelectedListId(defaultId)
        } else if (fetchedLists.length > 0) {
          setSelectedListId(fetchedLists[0].id)
        }
      } catch {
        // ignore
      }
    })()
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    const refMap = { list: listDropdownRef, time: timeDropdownRef, energy: energyDropdownRef }
    const handleClick = (e: MouseEvent) => {
      const ref = openDropdown ? refMap[openDropdown] : null
      if (ref?.current && !ref.current.contains(e.target as Node)) {
        setOpenDropdown(null)
      }
    }
    if (openDropdown) {
      document.addEventListener('mousedown', handleClick)
      return () => document.removeEventListener('mousedown', handleClick)
    }
  }, [openDropdown])

  // Resize window when preview / dropdown state changes
  useEffect(() => {
    let h = COLLAPSED_HEIGHT
    if (hasPreview) {
      h = PREVIEW_HEIGHT
      if (openDropdown === 'list' && lists.length > 0) {
        h += Math.min(lists.length, 6) * DROPDOWN_ITEM_HEIGHT + DROPDOWN_PADDING
      }
      if (openDropdown === 'time') {
        h += (TIME_PRESETS.length + (effectiveTime ? 1 : 0)) * DROPDOWN_ITEM_HEIGHT + DROPDOWN_PADDING
      }
      if (openDropdown === 'energy') {
        // 4 options: None + low + medium + high
        h += 4 * DROPDOWN_ITEM_HEIGHT + DROPDOWN_PADDING
      }
    }
    if (h !== lastHeightRef.current) {
      lastHeightRef.current = h
      window.api.setCaptureWindowSize(WINDOW_WIDTH, h)
    }
  }, [hasPreview, openDropdown, lists.length, effectiveTime])

  useEffect(() => {
    inputRef.current?.focus()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (openDropdown) {
          setOpenDropdown(null)
        } else {
          window.api.hideCaptureWindow()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [openDropdown])

  const handleSubmit = async () => {
    if (!value.trim() || submitting) return
    setSubmitting(true)
    try {
      const overrides: { listId?: string; energyLevel?: string; timeBoxMinutes?: number } = {}
      if (selectedListId) overrides.listId = selectedListId
      if (effectiveEnergy) overrides.energyLevel = effectiveEnergy
      if (effectiveTime) overrides.timeBoxMinutes = effectiveTime
      await window.api.quickCapture(value.trim(), overrides)
      setValue('')
      setSubmitting(false)
      window.api.hideCaptureWindow()
    } catch {
      setSubmitting(false)
    }
  }

  return (
    <div className="quick-capture-wrapper">
      <div className="quick-capture-card">
        <div className="quick-capture-container">
          <div className="quick-capture-icon">
            <Zap size={16} />
          </div>
          <input
            ref={inputRef}
            className="quick-capture-input"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit()
            }}
            placeholder="Quick capture... (e.g., Call dentist tomorrow high energy 30min)"
            disabled={submitting}
            autoFocus
          />
          {submitting && <div className="quick-capture-spinner spinner" />}
        </div>

        {hasPreview && (
        <div className="quick-capture-preview">
          <div className="quick-capture-tags">
            {parsed.dueLabel && (
              <span className="quick-capture-tag tag-date">
                {'\uD83D\uDCC5'} {parsed.dueLabel}
              </span>
            )}

            <div className="quick-capture-dropdown-anchor" ref={energyDropdownRef}>
              <button
                className={`quick-capture-tag tag-clickable ${effectiveEnergy ? `tag-energy-${effectiveEnergy}` : 'tag-empty'}`}
                onClick={() => setOpenDropdown(openDropdown === 'energy' ? null : 'energy')}
                type="button"
              >
                {effectiveEnergy
                  ? `${ENERGY_CONFIG[effectiveEnergy].emoji} ${ENERGY_CONFIG[effectiveEnergy].label}`
                  : '\u26A1 Energy'}
                <ChevronDown size={10} />
              </button>
              {openDropdown === 'energy' && (
                <div className="quick-capture-list-dropdown dropdown-right">
                  <button
                    className={`quick-capture-list-option${!effectiveEnergy ? ' selected' : ''}`}
                    onClick={() => {
                      setEnergyOverride(null)
                      setOpenDropdown(null)
                      inputRef.current?.focus()
                    }}
                    type="button"
                  >
                    None
                  </button>
                  {(['low', 'medium', 'high'] as EnergyLevel[]).map((level) => (
                    <button
                      key={level}
                      className={`quick-capture-list-option${effectiveEnergy === level ? ' selected' : ''}`}
                      onClick={() => {
                        setEnergyOverride(level)
                        setOpenDropdown(null)
                        inputRef.current?.focus()
                      }}
                      type="button"
                    >
                      {ENERGY_CONFIG[level].emoji} {ENERGY_CONFIG[level].label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="quick-capture-dropdown-anchor" ref={timeDropdownRef}>
              <button
                className={`quick-capture-tag tag-clickable ${effectiveTime ? 'tag-time' : 'tag-empty'}`}
                onClick={() => setOpenDropdown(openDropdown === 'time' ? null : 'time')}
                type="button"
              >
                {effectiveTime
                  ? `\u23F1 ${formatTime(effectiveTime)}`
                  : '\u23F1 Time'}
                <ChevronDown size={10} />
              </button>
              {openDropdown === 'time' && (
                <div className="quick-capture-list-dropdown dropdown-right">
                  {effectiveTime && (
                    <button
                      className="quick-capture-list-option"
                      onClick={() => {
                        setTimeOverride(null)
                        setOpenDropdown(null)
                        inputRef.current?.focus()
                      }}
                      type="button"
                    >
                      None
                    </button>
                  )}
                  {TIME_PRESETS.map((mins) => (
                    <button
                      key={mins}
                      className={`quick-capture-list-option${effectiveTime === mins ? ' selected' : ''}`}
                      onClick={() => {
                        setTimeOverride(mins)
                        setOpenDropdown(null)
                        inputRef.current?.focus()
                      }}
                      type="button"
                    >
                      {formatTime(mins)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {lists.length > 0 && (
            <div className="quick-capture-list-picker" ref={listDropdownRef}>
              <button
                className="quick-capture-tag tag-list tag-list-btn"
                onClick={() => setOpenDropdown(openDropdown === 'list' ? null : 'list')}
                type="button"
              >
                {'\uD83D\uDCCB'} {selectedList?.title || 'Select list'}
                <ChevronDown size={10} />
              </button>
              {openDropdown === 'list' && (
                <div className="quick-capture-list-dropdown">
                  {lists.map((list) => (
                    <button
                      key={list.id}
                      className={`quick-capture-list-option${list.id === selectedListId ? ' selected' : ''}`}
                      onClick={() => {
                        setSelectedListId(list.id)
                        setOpenDropdown(null)
                        inputRef.current?.focus()
                      }}
                      type="button"
                    >
                      {list.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        )}
      </div>
    </div>
  )
}
