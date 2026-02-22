import { useState, useEffect } from 'react'

export function useEODReview(signedIn: boolean) {
  const [shouldShow, setShouldShow] = useState(false)

  useEffect(() => {
    if (!signedIn) return

    const checkTrigger = async () => {
      // Check if review was already done today
      const result = await window.api.eodWasDoneToday()
      if (result.data === true) {
        setShouldShow(false)
        return
      }

      // Check if current time is past working hours end
      const settingsResult = await window.api.getPlannerSettings()
      const endTime = settingsResult?.data?.workingHoursEnd || '17:00'
      const [endH, endM] = endTime.split(':').map(Number)
      const now = new Date()
      const currentMinutes = now.getHours() * 60 + now.getMinutes()
      const endMinutes = endH * 60 + endM

      if (currentMinutes >= endMinutes) {
        setShouldShow(true)
      }
    }

    checkTrigger()
    // Re-check every 5 minutes
    const interval = setInterval(checkTrigger, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [signedIn])

  const dismiss = () => setShouldShow(false)

  return { shouldShow, dismiss }
}
