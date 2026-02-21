import { useState, useEffect, useCallback } from 'react'
import { CalendarEvent } from '../types'

// Google Calendar event colorId → hex (stable across the API)
const GCAL_EVENT_COLORS: Record<string, string> = {
  '1': '#a4bdfc', // Lavender
  '2': '#7ae7bf', // Sage
  '3': '#dbadff', // Grape
  '4': '#ff887c', // Flamingo
  '5': '#fbd75b', // Banana
  '6': '#ffb878', // Tangerine
  '7': '#46d6db', // Peacock
  '8': '#e1e1e1', // Graphite
  '9': '#5484ed', // Blueberry
  '10': '#51b749', // Basil
  '11': '#dc2127'  // Tomato
}

export type CalendarEventWithColor = CalendarEvent & { color: string }

export function useCalendar(signedIn: boolean) {
  const [events, setEvents] = useState<CalendarEventWithColor[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchEvents = useCallback(async () => {
    if (!signedIn) return
    setLoading(true)
    setError(null)
    try {
      const now = new Date()
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)

      // Fetch events and calendar list in parallel
      const [eventsResult, calendarsResult] = await Promise.all([
        window.api.getCalendarEvents('primary', startOfDay.toISOString(), endOfDay.toISOString()),
        window.api.getCalendars()
      ])

      // Build calendar color map
      const calendarColors = new Map<string, string>()
      if (calendarsResult.success && calendarsResult.data) {
        for (const cal of calendarsResult.data) {
          if (cal.id && cal.backgroundColor) {
            calendarColors.set(cal.id, cal.backgroundColor)
          }
        }
      }

      if (eventsResult.success && eventsResult.data) {
        const colored: CalendarEventWithColor[] = eventsResult.data.map((evt: CalendarEvent) => ({
          ...evt,
          color:
            (evt.colorId && GCAL_EVENT_COLORS[evt.colorId]) ||
            calendarColors.get(evt.calendarId) ||
            '#4a7dff'
        }))
        setEvents(colored)
      } else if (eventsResult.error) {
        setError(eventsResult.error)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch calendar events')
    } finally {
      setLoading(false)
    }
  }, [signedIn])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  return { events, loading, error, refresh: fetchEvents }
}
