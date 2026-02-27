/**
 * Analytics — 이벤트 추적
 * Phase 2에서 Mixpanel/PostHog 연동 예정. 현재는 console 로그.
 */

type EventName =
  | 'game_start'
  | 'game_end'
  | 'level_up'
  | 'skill_select'
  | 'boss_killed'
  | 'revive_used'
  | 'daily_claimed'
  | 'upgrade_purchased'
  | 'challenge_start'

type EventProperties = Record<string, string | number | boolean>

let initialized = false

export const initAnalytics = (): void => {
  if (initialized) return
  initialized = true
  // Phase 2: mixpanel.init(MIXPANEL_TOKEN)
}

export const trackEvent = (
  name: EventName,
  properties?: EventProperties,
): void => {
  if (!initialized) return

  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.debug('[Analytics]', name, properties)
  }

  // Phase 2: mixpanel.track(name, properties)
}

export const identifyUser = (userId: string): void => {
  if (!initialized) return
  // Phase 2: mixpanel.identify(userId)
  void userId
}
