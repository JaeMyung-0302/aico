import { useState, useEffect, useCallback } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISSED_KEY = 'wasd-install-dismissed'
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000

const isDismissed = (): boolean => {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY)
    if (!raw) return false
    const dismissed = Number(raw)
    if (Date.now() - dismissed < DISMISS_DURATION_MS) return true
    localStorage.removeItem(DISMISSED_KEY)
    return false
  } catch {
    return false
  }
}

export const useInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (isDismissed()) return

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setIsVisible(true)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const install = useCallback(async () => {
    if (!deferredPrompt) return

    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice

      if (outcome === 'accepted') {
        setIsVisible(false)
      }
    } catch {
      // prompt failed silently
    } finally {
      setDeferredPrompt(null)
    }
  }, [deferredPrompt])

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(DISMISSED_KEY, String(Date.now()))
    } catch {
      // storage unavailable
    }
    setIsVisible(false)
    setDeferredPrompt(null)
  }, [])

  return { isVisible, install, dismiss }
}
