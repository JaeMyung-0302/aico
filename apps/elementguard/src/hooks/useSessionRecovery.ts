import { useState, useEffect } from 'react'
import { loadSession, clearSession, type SessionData } from '@/lib/storage'

export const useSessionRecovery = () => {
  const [pendingSession, setPendingSession] = useState<SessionData | null>(null)
  const [showRecoveryPrompt, setShowRecoveryPrompt] = useState(false)

  useEffect(() => {
    const session = loadSession()
    if (session && session.wave > 0) {
      setPendingSession(session)
      setShowRecoveryPrompt(true)
    }
  }, [])

  const acceptRecovery = (): SessionData | null => {
    setShowRecoveryPrompt(false)
    const session = pendingSession
    setPendingSession(null)
    clearSession()
    return session
  }

  const declineRecovery = () => {
    setShowRecoveryPrompt(false)
    setPendingSession(null)
    clearSession()
  }

  return {
    showRecoveryPrompt,
    pendingSession,
    acceptRecovery,
    declineRecovery,
  }
}
