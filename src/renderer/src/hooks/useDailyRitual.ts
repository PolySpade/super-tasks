import { useState, useEffect } from 'react'

export function useDailyRitual(signedIn: boolean) {
  const [shouldShow, setShouldShow] = useState(false)

  useEffect(() => {
    if (!signedIn) return

    const check = async () => {
      const result = await window.api.ritualWasCompletedToday()
      if (result.data !== true) {
        // Only auto-show before 11 AM
        const hour = new Date().getHours()
        if (hour < 11) {
          setShouldShow(true)
        }
      }
    }

    check()
  }, [signedIn])

  const show = () => setShouldShow(true)
  const dismiss = () => setShouldShow(false)

  const complete = async () => {
    await window.api.ritualMarkComplete()
    setShouldShow(false)
  }

  return { shouldShow, show, dismiss, complete }
}
