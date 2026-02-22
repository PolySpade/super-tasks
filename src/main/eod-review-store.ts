import Store from 'electron-store'

export interface EODReview {
  date: string
  rating: number // 1-5
  reflection: string
  completedCount: number
  carriedOverCount: number
  focusMinutes: number
}

const store = new Store({ name: 'eod-reviews' })

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
