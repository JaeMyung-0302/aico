import { useState, useEffect, useCallback } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISSED_KEY = 'fridgemate-install-dismissed'
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000 // 7일

const isDismissed = (): boolean => {
  const raw = localStorage.getItem(DISMISSED_KEY)
  if (!raw) return false
  const timestamp = Number(raw)
  if (Date.now() - timestamp > DISMISS_DURATION_MS) {
    localStorage.removeItem(DISMISSED_KEY)
    return false
  }
  return true
}

export const useInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // standalone 모드면 이미 설치됨
    if (window.matchMedia('(display-mode: standalone)').matches) return
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
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setIsVisible(false)
    }
    setDeferredPrompt(null)
  }, [deferredPrompt])

  const dismiss = useCallback(() => {
    setIsVisible(false)
    setDeferredPrompt(null)
    localStorage.setItem(DISMISSED_KEY, String(Date.now()))
  }, [])

  return { isVisible, install, dismiss }
}
