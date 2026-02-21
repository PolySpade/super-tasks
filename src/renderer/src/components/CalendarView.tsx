import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { EventInput, DatesSetArg, DateSelectArg, EventDropArg } from '@fullcalendar/core'
import type { EventResizeDoneArg } from '@fullcalendar/interaction'
import type { EventClickArg } from '@fullcalendar/core'
import { Loader2, AlertCircle } from 'lucide-react'
import { useCalendarRange } from '../hooks/useCalendarRange'
import { CalendarToolbar } from './CalendarToolbar'
import { ScheduleTaskModal } from './ScheduleTaskModal'
import { EventEditModal } from './EventEditModal'
import { BulkActionBar } from './BulkActionBar'
import { Task, TaskList, PlannerSettings } from '../types'

type CalendarViewType = 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay'

// Category color coding based on keyword matching
function getCategoryColor(summary: string): string {
  const lower = summary.toLowerCase()
  if (lower.includes('thesis')) return '#9333ea'
  if (lower.includes('work')) return '#4a7dff'
  if (lower.includes('personal')) return '#34d399'
  if (lower.includes('meeting') || lower.includes('meet')) return '#f59e0b'
  if (lower.includes('exercise') || lower.includes('gym') || lower.includes('workout')) return '#ef4444'
  return '#6a6a88'
}

export function CalendarView() {
  const calendarRef = useRef<FullCalendar>(null)
  const { events, loading, error, fetchRange, updateEvent, invalidateCache } = useCalendarRange()

  const [signedIn, setSignedIn] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)
  const [taskLists, setTaskLists] = useState<TaskList[]>([])
  const [allTasks, setAllTasks] = useState<Task[]>([])
  const [settings, setSettings] = useState<PlannerSettings | null>(null)
  const [currentView, setCurrentView] = useState<CalendarViewType>('timeGridWeek')
  const [calendarTitle, setCalendarTitle] = useState('')

  // Schedule modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [modalDate, setModalDate] = useState<Date>(new Date())
  const [modalEnd, setModalEnd] = useState<Date | undefined>()

  // Multi-select state
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(new Set())

  // Edit event modal state
  const [editEvent, setEditEvent] = useState<{
    id: string
    calendarId: string
    summary: string
    start: string
    end: string
    description?: string
  } | null>(null)

  // Restore auth session on mount
  useEffect(() => {
    const init = async () => {
      try {
        const sessionResult = await window.api.restoreSession()
        if (sessionResult.success) {
          setSignedIn(true)

          // Fetch task lists, settings, and tasks in parallel
          const [listsResult, settingsResult] = await Promise.all([
            window.api.getTaskLists(),
            window.api.getPlannerSettings()
          ])

          if (listsResult.success && listsResult.data) {
            const lists: TaskList[] = listsResult.data.map((l: any) => ({
              id: l.id,
              title: l.title
            }))
            setTaskLists(lists)

            // Fetch tasks from all lists
            const taskPromises = lists.map((list) => window.api.getTasks(list.id))
            const taskResults = await Promise.all(taskPromises)
            const combined: Task[] = []
            for (const result of taskResults) {
              if (result.success && result.data) {
                combined.push(
                  ...result.data.map((t: any) => ({
                    id: t.id,
                    title: t.title,
                    status: t.status,
                    notes: t.notes || '',
                    due: t.due || undefined,
                    parent: t.parent || undefined
                  }))
                )
              }
            }
            setAllTasks(combined)
          }

          if (settingsResult.success && settingsResult.data) {
            setSettings(settingsResult.data)
          }
        }
      } finally {
        setAuthLoading(false)
      }
    }
    init()
  }, [])

  const calendarId = settings?.defaultCalendarId || 'primary'

  // Build tree from flat task list (for the modal)
  const taskTree = useMemo(() => {
    const taskMap = new Map<string, Task>()
    const roots: Task[] = []
    for (const t of allTasks) {
      taskMap.set(t.id, { ...t, children: [] })
    }
    for (const t of allTasks) {
      const node = taskMap.get(t.id)!
      if (t.parent && taskMap.has(t.parent)) {
        taskMap.get(t.parent)!.children!.push(node)
      } else {
        roots.push(node)
      }
    }
    return roots
  }, [allTasks])

  // Convert calendar events + tasks-with-due-dates into FullCalendar EventInput[]
  const calendarEvents: EventInput[] = useMemo(() => {
    const mapped: EventInput[] = []

    // Calendar events
    for (const evt of events) {
      const color = getCategoryColor(evt.summary)
      mapped.push({
        id: evt.id,
        title: evt.summary,
        start: evt.start,
        end: evt.end,
        backgroundColor: color,
        borderColor: color,
        extendedProps: {
          type: 'event',
          calendarId: evt.calendarId,
          description: evt.description
        }
      })
    }

    // Tasks with due dates (show as all-day events)
    for (const task of allTasks) {
      if (task.due && task.status === 'needsAction') {
        const color = getCategoryColor(task.title)
        mapped.push({
          id: `task-${task.id}`,
          title: task.title,
          start: task.due,
          allDay: true,
          backgroundColor: color,
          borderColor: color,
          editable: false,
          extendedProps: {
            type: 'task',
            taskId: task.id
          }
        })
      }
    }

    return mapped
  }, [events, allTasks])

  // FullCalendar callbacks
  const handleDatesSet = useCallback(
    (arg: DatesSetArg) => {
      setCalendarTitle(arg.view.title)
      setCurrentView(arg.view.type as CalendarViewType)
      setSelectedEventIds(new Set())
      if (signedIn) {
        fetchRange(arg.start, arg.end, calendarId)
      }
    },
    [signedIn, calendarId, fetchRange]
  )

  const handleDateClick = useCallback(
    (arg: { date: Date; allDay: boolean }) => {
      // If clicking on an all-day slot in month view, default to a 1hr block at 9am
      const clickDate = arg.allDay
        ? new Date(arg.date.getFullYear(), arg.date.getMonth(), arg.date.getDate(), 9, 0, 0)
        : arg.date
      setModalDate(clickDate)
      setModalEnd(undefined)
      setModalOpen(true)
    },
    []
  )

  const handleSelect = useCallback((arg: DateSelectArg) => {
    const start = arg.allDay
      ? new Date(arg.start.getFullYear(), arg.start.getMonth(), arg.start.getDate(), 9, 0, 0)
      : arg.start
    const end = arg.allDay
      ? new Date(arg.start.getFullYear(), arg.start.getMonth(), arg.start.getDate(), 10, 0, 0)
      : arg.end
    setModalDate(start)
    setModalEnd(end)
    setModalOpen(true)

    // Unselect the FullCalendar selection
    const api = calendarRef.current?.getApi()
    if (api) api.unselect()
  }, [])

  const handleEventDrop = useCallback(
    async (arg: EventDropArg) => {
      const { event } = arg
      // Only update calendar events, not tasks
      if (event.extendedProps?.type === 'task') {
        arg.revert()
        return
      }

      const eventCalendarId = event.extendedProps?.calendarId || calendarId
      const updates: { start?: string; end?: string } = {}
      if (event.start) updates.start = event.start.toISOString()
      if (event.end) updates.end = event.end.toISOString()

      await updateEvent(eventCalendarId, event.id, updates)
    },
    [calendarId, updateEvent]
  )

  const handleEventResize = useCallback(
    async (arg: EventResizeDoneArg) => {
      const { event } = arg
      if (event.extendedProps?.type === 'task') {
        arg.revert()
        return
      }

      const eventCalendarId = event.extendedProps?.calendarId || calendarId
      const updates: { start?: string; end?: string } = {}
      if (event.start) updates.start = event.start.toISOString()
      if (event.end) updates.end = event.end.toISOString()

      await updateEvent(eventCalendarId, event.id, updates)
    },
    [calendarId, updateEvent]
  )

  const handleEventClick = useCallback(
    (arg: EventClickArg) => {
      const { event } = arg
      // Skip task items — only edit calendar events
      if (event.extendedProps?.type === 'task') return

      // Shift+click → toggle multi-select
      if (arg.jsEvent.shiftKey) {
        setSelectedEventIds((prev) => {
          const next = new Set(prev)
          if (next.has(event.id)) {
            next.delete(event.id)
          } else {
            next.add(event.id)
          }
          return next
        })
        return
      }

      setEditEvent({
        id: event.id,
        calendarId: event.extendedProps?.calendarId || calendarId,
        summary: event.title,
        start: event.start?.toISOString() || '',
        end: event.end?.toISOString() || '',
        description: event.extendedProps?.description || ''
      })
    },
    [calendarId]
  )

  const handleEventSaved = useCallback(() => {
    setEditEvent(null)
    invalidateCache()
    const api = calendarRef.current?.getApi()
    if (api) {
      fetchRange(api.view.activeStart, api.view.activeEnd, calendarId)
    }
  }, [calendarId, fetchRange, invalidateCache])

  const handleEventDeleted = useCallback(() => {
    setEditEvent(null)
    invalidateCache()
    const api = calendarRef.current?.getApi()
    if (api) {
      fetchRange(api.view.activeStart, api.view.activeEnd, calendarId)
    }
  }, [calendarId, fetchRange, invalidateCache])

  // Bulk action handlers
  const clearSelection = useCallback(() => {
    setSelectedEventIds(new Set())
  }, [])

  const handleBulkDelete = useCallback(async () => {
    const ids = Array.from(selectedEventIds)
    await Promise.all(
      ids.map((id) => {
        const evt = events.find((e) => e.id === id)
        const evtCalId = evt?.calendarId || calendarId
        return window.api.deleteCalendarEvent(evtCalId, id)
      })
    )
    setSelectedEventIds(new Set())
    invalidateCache()
    const api = calendarRef.current?.getApi()
    if (api) {
      fetchRange(api.view.activeStart, api.view.activeEnd, calendarId)
    }
  }, [selectedEventIds, events, calendarId, invalidateCache, fetchRange])

  const handleBulkMove = useCallback(
    async (targetDate: string) => {
      const ids = Array.from(selectedEventIds)
      await Promise.all(
        ids.map((id) => {
          const evt = events.find((e) => e.id === id)
          if (!evt) return Promise.resolve()
          const evtCalId = evt.calendarId || calendarId

          // Replace date portion, keep the time
          const oldStart = new Date(evt.start)
          const oldEnd = new Date(evt.end)
          const [year, month, day] = targetDate.split('-').map(Number)

          const newStart = new Date(oldStart)
          newStart.setFullYear(year, month - 1, day)

          const newEnd = new Date(oldEnd)
          // Shift end by same day-delta as start
          const dayDelta = newStart.getTime() - oldStart.getTime()
          newEnd.setTime(oldEnd.getTime() + dayDelta)

          return window.api.updateCalendarEvent(evtCalId, id, {
            start: newStart.toISOString(),
            end: newEnd.toISOString()
          })
        })
      )
      setSelectedEventIds(new Set())
      invalidateCache()
      const api = calendarRef.current?.getApi()
      if (api) {
        fetchRange(api.view.activeStart, api.view.activeEnd, calendarId)
      }
    },
    [selectedEventIds, events, calendarId, invalidateCache, fetchRange]
  )

  // Escape key clears selection
  useEffect(() => {
    if (selectedEventIds.size === 0) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedEventIds(new Set())
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedEventIds.size])

  // Toolbar handlers
  const handleViewChange = useCallback((view: CalendarViewType) => {
    const api = calendarRef.current?.getApi()
    if (api) {
      api.changeView(view)
      setCurrentView(view)
    }
  }, [])

  const handlePrev = useCallback(() => {
    calendarRef.current?.getApi()?.prev()
  }, [])

  const handleNext = useCallback(() => {
    calendarRef.current?.getApi()?.next()
  }, [])

  const handleToday = useCallback(() => {
    calendarRef.current?.getApi()?.today()
  }, [])

  // Modal handlers
  const handleModalCreated = useCallback(() => {
    setModalOpen(false)
    invalidateCache()
    // Re-fetch the current view range
    const api = calendarRef.current?.getApi()
    if (api) {
      fetchRange(api.view.activeStart, api.view.activeEnd, calendarId)
    }
  }, [calendarId, fetchRange, invalidateCache])

  const handleModalClose = useCallback(() => {
    setModalOpen(false)
  }, [])

  // Loading / auth states
  if (authLoading) {
    return (
      <div className="calendar-view">
        <div className="calendar-view-loading">
          <Loader2 size={24} className="spin" />
          <span>Loading calendar...</span>
        </div>
      </div>
    )
  }

  if (!signedIn) {
    return (
      <div className="calendar-view">
        <div className="calendar-view-loading">
          <AlertCircle size={24} />
          <span>Not signed in. Please sign in from the main window.</span>
        </div>
      </div>
    )
  }

  return (
    <div className="calendar-view">
      <CalendarToolbar
        currentView={currentView}
        onViewChange={handleViewChange}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={handleToday}
        title={calendarTitle}
      />

      {error && (
        <div className="error-banner">
          <span>{error}</span>
        </div>
      )}

      <div className="calendar-view-body">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          headerToolbar={false}
          events={calendarEvents}
          datesSet={handleDatesSet}
          dateClick={handleDateClick}
          select={handleSelect}
          eventClick={handleEventClick}
          eventDrop={handleEventDrop}
          eventResize={handleEventResize}
          editable={true}
          eventStartEditable={true}
          eventDurationEditable={true}
          selectable={true}
          selectMirror={true}
          dayMaxEvents={true}
          nowIndicator={true}
          height="auto"
          allDaySlot={true}
          slotMinTime="06:00:00"
          slotMaxTime="23:00:00"
          slotDuration="00:30:00"
          expandRows={true}
          weekends={true}
          firstDay={1}
          eventDisplay="block"
          eventClassNames={(info) =>
            selectedEventIds.has(info.event.id) ? ['fc-event-selected'] : []
          }
        />
      </div>

      {loading && (
        <div className="calendar-view-spinner">
          <div className="spinner" />
        </div>
      )}

      {modalOpen && (
        <ScheduleTaskModal
          tasks={taskTree}
          selectedDate={modalDate}
          selectedEnd={modalEnd}
          calendarId={calendarId}
          onClose={handleModalClose}
          onCreated={handleModalCreated}
        />
      )}

      {editEvent && (
        <EventEditModal
          eventId={editEvent.id}
          calendarId={editEvent.calendarId}
          summary={editEvent.summary}
          start={editEvent.start}
          end={editEvent.end}
          description={editEvent.description}
          onClose={() => setEditEvent(null)}
          onSaved={handleEventSaved}
          onDeleted={handleEventDeleted}
        />
      )}

      {selectedEventIds.size > 0 && (
        <BulkActionBar
          count={selectedEventIds.size}
          onDelete={handleBulkDelete}
          onMove={handleBulkMove}
          onClear={clearSelection}
        />
      )}
    </div>
  )
}
