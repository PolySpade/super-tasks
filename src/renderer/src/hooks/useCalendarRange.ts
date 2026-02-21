import { useState, useCallback, useRef } from 'react'
import { CalendarEvent } from '../types'

interface CachedRange {
  start: string
  end: string
  calendarId: string
}

export function useCalendarRange() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const lastRange = useRef<CachedRange | null>(null)

  const fetchRange = useCallback(
    async (start: Date, end: Date, calendarId: string = 'primary') => {
      const startISO = start.toISOString()
      const endISO = end.toISOString()

      // Skip if we already fetched this exact range
      if (
        lastRange.current &&
        lastRange.current.start === startISO &&
        lastRange.current.end === endISO &&
        lastRange.current.calendarId === calendarId
      ) {
        return
      }

      setLoading(true)
      setError(null)
      try {
        const result = await window.api.getCalendarEvents(calendarId, startISO, endISO)
        if (result.success && result.data) {
          setEvents(result.data)
          lastRange.current = { start: startISO, end: endISO, calendarId }
        } else if (result.error) {
          setError(result.error)
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch calendar events')
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const updateEvent = useCallback(
    async (
      calendarId: string,
      eventId: string,
      updates: { start?: string; end?: string; summary?: string; description?: string }
    ) => {
      // Optimistic update
      setEvents((prev) =>
        prev.map((e) =>
          e.id === eventId
            ? {
                ...e,
                ...(updates.start !== undefined && { start: updates.start }),
                ...(updates.end !== undefined && { end: updates.end }),
                ...(updates.summary !== undefined && { summary: updates.summary }),
                ...(updates.description !== undefined && { description: updates.description })
              }
            : e
        )
      )

      const result = await window.api.updateCalendarEvent(calendarId, eventId, updates)
      if (!result.success) {
        // Revert — invalidate cache so next navigation re-fetches
        lastRange.current = null
        setError(result.error || 'Failed to update event')
      }
    },
    []
  )

  const invalidateCache = useCallback(() => {
    lastRange.current = null
  }, [])

  return { events, loading, error, fetchRange, updateEvent, invalidateCache }
}
