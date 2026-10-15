import type { AnalyticsEvent } from '@miri-pet/shared'

export type Tracker = (event: AnalyticsEvent, properties?: Record<string, string | number | boolean>) => void

// PostHog 키가 없으면(개발·테스트) 아무것도 보내지 않는다. distinctId는 userId만 쓴다 (D11)
let activeTracker: Tracker = () => undefined

export const setTracker = (tracker: Tracker): void => {
  activeTracker = tracker
}

export const track: Tracker = (event, properties) => {
  activeTracker(event, properties)
}
