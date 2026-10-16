import { useEffect } from 'react'
import type { Analytics } from './posthog'

// 세션의 userId를 PostHog distinctId로 맞춘다. 로그아웃(null)이면 reset
export const useAnalyticsIdentity = (analytics: Analytics | null, userId: string | null): void => {
  useEffect(() => {
    analytics?.setUserId(userId)
  }, [analytics, userId])
}
