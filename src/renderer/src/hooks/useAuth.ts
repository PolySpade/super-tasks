import { useState, useEffect, useCallback } from 'react'

export function useAuth() {
  const [signedIn, setSignedIn] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    window.api.restoreSession().then((result) => {
      setSignedIn(result.success)
      setLoading(false)
    })
  }, [])

  const signIn = useCallback(async () => {
    setLoading(true)
    const result = await window.api.signIn()
    setSignedIn(result.success)
    setLoading(false)
    return result
  }, [])

  const signOut = useCallback(async () => {
    await window.api.signOut()
    setSignedIn(false)
  }, [])

  return { signedIn, loading, signIn, signOut }
}
