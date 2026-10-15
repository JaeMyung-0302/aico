// 기획서 §4 이벤트. PostHog distinctId는 내부 userId만 쓴다(이메일·닉네임 금지)
export const ANALYTICS_EVENTS = [
  'app_open',
  'onboarding_completed',
  'pet_created',
  'vaccination_created',
  'post_created',
  'follow_created',
  'place_viewed',
  'place_report_submitted',
] as const
export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number]
