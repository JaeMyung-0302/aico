import { PostHog } from 'posthog-react-native'
import { setTracker, type Tracker } from './track'

type AnalyticsClient = Pick<PostHog, 'capture' | 'identify' | 'reset'>
type CreateClient = (apiKey: string, host: string) => AnalyticsClient

export type Analytics = {
  tracker: Tracker
  // 세션의 내 userId (로그아웃이면 null)
  setUserId: (userId: string | null) => void
}

const DEFAULT_POSTHOG_HOST = 'https://us.i.posthog.com'

// D11: distinctId = 내부 userId만. identify에 속성(이메일·닉네임)을 넣지 않고, 로그인 전 익명 이벤트는 버린다
export const createAnalytics = (client: AnalyticsClient): Analytics => {
  let currentUserId: string | null = null
  return {
    tracker: (event, properties) => {
      if (!currentUserId) return
      client.capture(event, properties)
    },
    setUserId: (userId) => {
      if (userId === currentUserId) return
      if (userId) client.identify(userId)
      else client.reset()
      currentUserId = userId
    },
  }
}

// 앱 생명주기 자동 이벤트는 끈다(익명 distinctId로 나가지 않게). 키가 있을 때만 만든다
const createPosthogClient: CreateClient = (apiKey, host) =>
  new PostHog(apiKey, { host, captureAppLifecycleEvents: false })

// 키가 없으면 null — 전역 track은 기본 no-op 그대로
export const initAnalytics = (
  apiKey: string | undefined,
  host: string | undefined,
  createClient: CreateClient = createPosthogClient,
): Analytics | null => {
  const key = apiKey?.trim()
  if (!key) return null
  const analytics = createAnalytics(createClient(key, host || DEFAULT_POSTHOG_HOST))
  setTracker(analytics.tracker)
  return analytics
}
