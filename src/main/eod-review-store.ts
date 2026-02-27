import Store from 'electron-store'

export interface EODReview {
  date: string
  rating: number // 1-5
  reflection: string
  completedCount: number
  carriedOverCount: number
  focusMinutes: number
}

export const store = new Store({ name: 'eod-reviews' })

function getReviews(): EODReview[] {
  return (store.get('reviews') as EODReview[] | undefined) || []
}

export function wasDoneToday(): boolean {
  const today = new Date().toISOString().split('T')[0]
  return getReviews().some((r) => r.date === today)
}

export function saveReview(review: EODReview): void {
  const reviews = getReviews()
  const existing = reviews.findIndex((r) => r.date === review.date)
  if (existing !== -1) {
    reviews[existing] = review
  } else {
    reviews.push(review)
  }
  // Keep last 90 days only
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 90)
  const cutoffStr = cutoff.toISOString().split('T')[0]
  const filtered = reviews.filter((r) => r.date >= cutoffStr)
  store.set('reviews', filtered)
}

export function getRecentReviews(count: number = 7): EODReview[] {
  const reviews = getReviews()
  return reviews.sort((a, b) => b.date.localeCompare(a.date)).slice(0, count)
}

export function getAverageRating(days: number = 7): number | null {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  const cutoffStr = cutoff.toISOString().split('T')[0]
  const recent = getReviews().filter((r) => r.date >= cutoffStr && r.rating > 0)
  if (recent.length === 0) return null
  return recent.reduce((sum, r) => sum + r.rating, 0) / recent.length
}

export interface MoodStats {
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

export function getMoodStats(): MoodStats {
  const reviews = getReviews()
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

  // Build 7-day array (6 days back + today)
  const weekData: MoodStats['weekData'] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    const review = reviews.find((r) => r.date === dateStr)
    weekData.push({
      date: dateStr,
      dayLabel: dayNames[d.getDay()],
      rating: review?.rating ?? 0,
      completedCount: review?.completedCount ?? 0,
      focusMinutes: review?.focusMinutes ?? 0
    })
  }

  const currentAvg = getAverageRating(7)

  // Previous avg: days 8-14 back
  const prev14 = new Date()
  prev14.setDate(prev14.getDate() - 14)
  const prev14Str = prev14.toISOString().split('T')[0]
  const prev7 = new Date()
  prev7.setDate(prev7.getDate() - 7)
  const prev7Str = prev7.toISOString().split('T')[0]
  const prevReviews = reviews.filter((r) => r.date >= prev14Str && r.date < prev7Str && r.rating > 0)
  const previousAvg = prevReviews.length > 0
    ? prevReviews.reduce((sum, r) => sum + r.rating, 0) / prevReviews.length
    : null

  let trend: MoodStats['trend'] = null
  if (currentAvg !== null && previousAvg !== null) {
    const diff = currentAvg - previousAvg
    if (diff > 0.2) trend = 'up'
    else if (diff < -0.2) trend = 'down'
    else trend = 'same'
  }

  // Latest non-empty reflection
  const withReflection = reviews
    .filter((r) => r.reflection && r.reflection.trim().length > 0)
    .sort((a, b) => b.date.localeCompare(a.date))
  const latestReflection = withReflection.length > 0 ? withReflection[0].reflection : null
  const latestReflectionDate = withReflection.length > 0 ? withReflection[0].date : null

  // Streak: consecutive days with a review counting back from today
  let streak = 0
  const sorted = reviews.sort((a, b) => b.date.localeCompare(a.date))
  let checkDate = new Date(today)
  // If today has no review, start checking from yesterday
  if (!sorted.find((r) => r.date === todayStr)) {
    checkDate.setDate(checkDate.getDate() - 1)
  }
  for (let i = 0; i < 90; i++) {
    const checkStr = checkDate.toISOString().split('T')[0]
    if (sorted.find((r) => r.date === checkStr)) {
      streak++
      checkDate.setDate(checkDate.getDate() - 1)
    } else {
      break
    }
  }

  return {
    weekData,
    currentAvg,
    previousAvg,
    trend,
    latestReflection,
    latestReflectionDate,
    streak,
    doneToday: wasDoneToday()
  }
}

export function saveQuickMood(rating: number): void {
  const today = new Date().toISOString().split('T')[0]
  const reviews = getReviews()
  const existing = reviews.find((r) => r.date === today)
  if (existing) {
    existing.rating = rating
    store.set('reviews', reviews)
  } else {
    saveReview({
      date: today,
      rating,
      reflection: '',
      completedCount: 0,
      carriedOverCount: 0,
      focusMinutes: 0
    })
  }
}
