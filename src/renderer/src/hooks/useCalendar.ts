import { useState, useEffect, useCallback } from 'react'
import { CalendarEvent } from '../types'

export function useCalendar(signedIn: boolean) {
  const [events, setEvents] = useState<CalendarEvent[]>([])
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
      const result = await window.api.getCalendarEvents(
        'primary',
        startOfDay.toISOString(),
        endOfDay.toISOString()
      )
      if (result.success && result.data) {
        setEvents(result.data)
      } else if (result.error) {
        setError(result.error)
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
