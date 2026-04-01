import { Router } from 'express'
import type { SessionInfo, SSEEvent } from '@neurex-viz/shared'

export const createSessionsRouter = (): { router: Router; trackEvent: (event: SSEEvent) => void } => {
  const router = Router()
  const sessions = new Map<string, SessionInfo>()

  const STALE_TIMEOUT = 120_000 // 2 minutes

  const trackEvent = (event: SSEEvent) => {
    if (!event.session || event.type === 'phase_change') return

    const key = event.session
    const existing = sessions.get(key)

    if (existing) {
      existing.lastSeen = Date.now()
      existing.eventCount++
      if (event.project && event.project !== 'unknown') {
        existing.project = event.project
      }
    } else {
      sessions.set(key, {
        sessionId: key,
        project: event.project ?? 'unknown',
        lastSeen: Date.now(),
        eventCount: 1,
      })
    }
  }

  // Clean stale sessions periodically
  setInterval(() => {
    const now = Date.now()
    for (const [key, info] of sessions) {
      if (now - info.lastSeen > STALE_TIMEOUT) {
        sessions.delete(key)
      }
    }
  }, 30_000)

  router.get('/', (_req, res) => {
    const activeSessions = [...sessions.values()]
      .filter((s) => Date.now() - s.lastSeen < STALE_TIMEOUT)
      .sort((a, b) => b.lastSeen - a.lastSeen)
    res.json(activeSessions)
  })

  return { router, trackEvent }
}
