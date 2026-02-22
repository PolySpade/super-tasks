import { useState, useEffect } from 'react'
import { PlannerSettings, Task, TaskList, TaskMetadata } from '../types'
import { useCalendar, CalendarEventWithColor } from '../hooks/useCalendar'
import { usePlanner } from '../hooks/usePlanner'
import { TimeBlockRow } from './TimeBlock'
import { PlanConfirm } from './PlanConfirm'
import { BlockFormModal } from './BlockFormModal'
import { Sparkles, Calendar, CheckCircle, AlertCircle, Settings, Plus, Hammer } from 'lucide-react'

interface PlanViewProps {
  signedIn: boolean
  taskLists: TaskList[]
  onOpenSettings: () => void
  metadataMap: Record<string, TaskMetadata>
  mits: string[]
}

export function PlanView({ signedIn, taskLists, onOpenSettings, metadataMap, mits }: PlanViewProps) {
  const { events, loading: eventsLoading, refresh: refreshEvents } = useCalendar(signedIn)
  const { plan, state, error, generatePlan, confirmPlan, rejectBlock, rejectTask, reset, startManualPlan, addBlock, editBlock } = usePlanner()
  const [settings, setSettings] = useState<PlannerSettings | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [selectedListIds, setSelectedListIds] = useState<Set<string>>(new Set())
  const [showBlockForm, setShowBlockForm] = useState(false)
  const [editingBlockIndex, setEditingBlockIndex] = useState<number | null>(null)

  useEffect(() => {
    window.api.getPlannerSettings().then((result) => {
      if (result.success && result.data) {
        setSettings(result.data)
      }
    })
  }, [])

  // Auto-select all lists when they load
  useEffect(() => {
    if (taskLists.length > 0 && selectedListIds.size === 0) {
      setSelectedListIds(new Set(taskLists.map((l) => l.id)))
    }
  }, [taskLists])

  const hasApiKey = settings?.aiApiKey && settings.aiApiKey !== ''

  // Map context block names to colors
  const getBlockColor = (blockName: string): string => {
    const lower = blockName.toLowerCase()
    if (lower.includes('deep work') || lower.includes('focus')) return '#5484ed'
    if (lower.includes('communication') || lower.includes('meeting')) return '#ff887c'
    if (lower.includes('admin') || lower.includes('planning')) return '#7ae7bf'
    if (lower.includes('creative')) return '#dbadff'
    if (lower.includes('review')) return '#46d6db'
    return '#ffb878'
  }

  const toggleList = (id: string) => {
    setSelectedListIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleGenerate = async () => {
    if (!settings || selectedListIds.size === 0) return

    // Fetch tasks from all selected lists
    const allTasks: Task[] = []
    for (const listId of selectedListIds) {
      const result = await window.api.getTasks(listId)
      if (result.success && result.data) {
        allTasks.push(...result.data)
      }
    }

    generatePlan(allTasks, events, settings, mits, metadataMap)
  }

  const handleConfirm = () => {
    const calendarId = settings?.defaultCalendarId || 'primary'
    confirmPlan(calendarId)
    setShowConfirm(false)
  }

  const handleDone = () => {
    reset()
    refreshEvents()
  }

  const formatTime = (isoString: string): string => {
    if (!isoString.includes('T')) return 'All day'
    const date = new Date(isoString)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
  }

  const today = new Date()
  const dateStr = today.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  })

  // No API key configured
  if (settings && !hasApiKey) {
    return (
      <div className="plan-view">
        <div className="plan-setup-card">
          <AlertCircle size={28} className="plan-setup-icon" />
          <p className="plan-setup-title">AI Planner Setup</p>
          <p className="plan-setup-text">
            Add your AI API key in Settings to start planning your day, or build a plan manually.
          </p>
          <button className="plan-setup-btn" onClick={onOpenSettings}>
            <Settings size={14} />
            Open Settings
          </button>
          <button className="plan-manual-btn" onClick={startManualPlan}>
            <Hammer size={14} />
            Build Manually
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="plan-view">
      <div className="plan-header">
        <Calendar size={14} />
        <span>{dateStr}</span>
      </div>

      {/* Done state */}
      {state === 'done' && (
        <div className="plan-done-card">
          <CheckCircle size={24} className="plan-done-icon" />
          <p className="plan-done-title">Schedule created!</p>
          <p className="plan-done-text">Events have been added to your calendar.</p>
          <button className="plan-generate-btn" onClick={handleDone}>
            Plan Again
          </button>
        </div>
      )}

      {/* Error state */}
      {state === 'error' && error && (
        <div className="plan-error-card">
          <AlertCircle size={16} />
          <span>{error}</span>
          <button className="plan-error-retry" onClick={reset}>
            Try Again
          </button>
        </div>
      )}

      {/* Idle or review */}
      {(state === 'idle' || state === 'review' || state === 'confirming') && (
        <>
          {state === 'idle' && (
            <>
              {/* Task list picker */}
              {taskLists.length > 0 && (
                <div className="plan-section">
                  <div className="plan-section-label">Include lists</div>
                  <div className="plan-list-picker">
                    {taskLists.map((list) => (
                      <label key={list.id} className="plan-list-option">
                        <input
                          type="checkbox"
                          checked={selectedListIds.has(list.id)}
                          onChange={() => toggleList(list.id)}
                        />
                        <span className="plan-list-check" />
                        <span className="plan-list-name">{list.title}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <button
                className="plan-generate-btn"
                onClick={handleGenerate}
                disabled={eventsLoading || !settings || selectedListIds.size === 0}
              >
                <Sparkles size={14} />
                Plan My Day
              </button>
              <button className="plan-manual-btn" onClick={startManualPlan}>
                <Hammer size={14} />
                Build Manually
              </button>
            </>
          )}

          {/* Existing events */}
          {events.length > 0 && state === 'idle' && (
            <div className="plan-section">
              <div className="plan-section-label">Today's Events</div>
              {events.map((event: CalendarEventWithColor) => (
                <TimeBlockRow
                  key={event.id}
                  start={formatTime(event.start)}
                  end={formatTime(event.end)}
                  title={event.summary}
                  type="event"
                  color={event.color}
                />
              ))}
            </div>
          )}

          {eventsLoading && state === 'idle' && (
            <div className="plan-loading-events">
              <div className="spinner" />
            </div>
          )}

          {/* AI plan review */}
          {state === 'review' && plan && (
            <>
              {plan.summary && (
                <div className="plan-summary-card">
                  <Sparkles size={12} />
                  <span>{plan.summary}</span>
                </div>
              )}
              <div className="plan-section">
                <div className="plan-section-label">Schedule</div>
                {plan.blocks.map((block, index) => (
                  <TimeBlockRow
                    key={index}
                    start={block.start}
                    end={block.end}
                    title={block.blockName}
                    reason={block.reason}
                    type="context-block"
                    color={getBlockColor(block.blockName)}
                    tasks={block.tasks}
                    onRemove={() => rejectBlock(index)}
                    onRemoveTask={(taskIndex) => rejectTask(index, taskIndex)}
                    onEdit={() => setEditingBlockIndex(index)}
                  />
                ))}
                <button
                  className="plan-add-block-btn"
                  onClick={() => setShowBlockForm(true)}
                >
                  <Plus size={14} />
                  Add Block
                </button>
              </div>
              {plan.blocks.length > 0 && (
                <button
                  className="plan-apply-btn"
                  onClick={() => setShowConfirm(true)}
                >
                  <CheckCircle size={14} />
                  Apply to Calendar
                </button>
              )}
              <button className="plan-reset-btn" onClick={reset}>
                Start Over
              </button>
            </>
          )}

          {/* Confirming */}
          {state === 'confirming' && (
            <div className="plan-loading-overlay">
              <div className="spinner" />
              <span>Creating events...</span>
            </div>
          )}

          {showConfirm && plan && (
            <PlanConfirm
              blockCount={plan.blocks.length}
              onConfirm={handleConfirm}
              onCancel={() => setShowConfirm(false)}
            />
          )}
        </>
      )}

      {/* Generating */}
      {state === 'generating' && (
        <div className="plan-generating">
          <div className="spinner" />
          <span>AI is planning your day...</span>
        </div>
      )}

      {/* Block form modal — add */}
      {showBlockForm && (
        <BlockFormModal
          onClose={() => setShowBlockForm(false)}
          onSubmit={(data) => {
            addBlock(data)
            setShowBlockForm(false)
          }}
        />
      )}

      {/* Block form modal — edit */}
      {editingBlockIndex !== null && plan && plan.blocks[editingBlockIndex] && (
        <BlockFormModal
          initial={{
            blockName: plan.blocks[editingBlockIndex].blockName,
            start: plan.blocks[editingBlockIndex].start,
            end: plan.blocks[editingBlockIndex].end
          }}
          onClose={() => setEditingBlockIndex(null)}
          onSubmit={(data) => {
            editBlock(editingBlockIndex, data)
            setEditingBlockIndex(null)
          }}
        />
      )}
    </div>
  )
}
