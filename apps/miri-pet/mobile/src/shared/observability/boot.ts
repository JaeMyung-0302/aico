import { initAnalytics } from '@/shared/analytics/posthog'
import { initSentry } from './sentry'

// 앱 시작 시(루트 _layout import 시점) 1회. 키가 비면 둘 다 no-op
// EXPO_PUBLIC_* 는 빌드 때 인라인되므로 process.env.EXPO_PUBLIC_X 형태 그대로 참조해야 한다
export const isSentryEnabled = initSentry(
  process.env.EXPO_PUBLIC_SENTRY_DSN,
  process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT,
)

export const analytics = initAnalytics(process.env.EXPO_PUBLIC_POSTHOG_API_KEY, process.env.EXPO_PUBLIC_POSTHOG_HOST)
