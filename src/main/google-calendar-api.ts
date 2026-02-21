import { google, calendar_v3 } from 'googleapis'
import { getAuthClient } from './google-auth'

function getCalendarApi(): calendar_v3.Calendar {
  return google.calendar({ version: 'v3', auth: getAuthClient() })
}

export async function getCalendars() {
  const api = getCalendarApi()
  const res = await api.calendarList.list({ maxResults: 100 })
  return (res.data.items || []).map((cal) => ({
    id: cal.id || '',
    summary: cal.summary || '',
    primary: cal.primary || false
  }))
}

export async function getEvents(calendarId: string, timeMin: string, timeMax: string) {
  const api = getCalendarApi()
  const res = await api.events.list({
    calendarId,
    timeMin,
    timeMax,
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 100
  })
  return (res.data.items || []).map((event) => ({
    id: event.id || '',
    summary: event.summary || '(No title)',
    start: event.start?.dateTime || event.start?.date || '',
    end: event.end?.dateTime || event.end?.date || '',
    description: event.description || '',
    calendarId
  }))
}

export async function createEvent(
  calendarId: string,
  event: { summary: string; start: string; end: string; description?: string }
) {
  const api = getCalendarApi()
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const res = await api.events.insert({
    calendarId,
    requestBody: {
      summary: event.summary,
      description: event.description,
      start: { dateTime: event.start, timeZone },
      end: { dateTime: event.end, timeZone }
    }
  })
  return res.data
}

export async function deleteEvent(calendarId: string, eventId: string) {
  const api = getCalendarApi()
  await api.events.delete({ calendarId, eventId })
}
