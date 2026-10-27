import * as Sentry from '@sentry/nestjs'
import type { Event } from '@sentry/nestjs'

// process.env를 그대로 받는다 (SENTRY_DSN, SENTRY_ENVIRONMENT, SENTRY_RELEASE, SENTRY_TRACES_SAMPLE_RATE, NODE_ENV)
type SentryEnv = Record<string, string | undefined>

// 일기 본문·좌표·사진 URL이 담길 수 있는 키 (shared FORBIDDEN_EVENT_PROP_KEYS와 같은 목록)
const SCRUB_KEYS: ReadonlySet<string> = new Set(['lat', 'lng', 'uri', 'url', 'body', 'text'])
const FILTERED = '[Filtered]'

// 키 이름 기준으로 값을 지운 복사본. Sentry가 어차피 JSON으로 보내므로 JSON 왕복으로 깊은 복사한다.
// 요청 본문(data)·query string은 키와 상관없이 사적인 내용이라 통째로 뺀다
export const scrubEvent = <T extends Event>(event: T): T => {
  const withoutPayload = event.request
    ? { ...event, request: { ...event.request, data: undefined, query_string: undefined } }
    : event
  return JSON.parse(
    JSON.stringify(withoutPayload, (key: string, value: unknown) =>
      SCRUB_KEYS.has(key.toLowerCase()) ? FILTERED : value,
    ),
  )
}

export type SentryOptions = {
  dsn: string
  environment: string
  release?: string
  tracesSampleRate: number
  sendDefaultPii: false
  beforeSend: typeof scrubEvent
}

const parseSampleRate = (raw: string | undefined): number => {
  const rate = Number(raw ?? 0)
  return Number.isFinite(rate) && rate >= 0 && rate <= 1 ? rate : 0
}

// SENTRY_DSN이 비면(개발·테스트) null → Sentry를 켜지 않는다. 개인정보(IP·쿠키·헤더)는 보내지 않는다
export const buildSentryOptions = (env: SentryEnv): SentryOptions | null => {
  const dsn = env.SENTRY_DSN?.trim()
  if (!dsn) return null
  return {
    dsn,
    environment: env.SENTRY_ENVIRONMENT || env.NODE_ENV || 'development',
    ...(env.SENTRY_RELEASE ? { release: env.SENTRY_RELEASE } : {}),
    tracesSampleRate: parseSampleRate(env.SENTRY_TRACES_SAMPLE_RATE),
    sendDefaultPii: false,
    beforeSend: scrubEvent,
  }
}

export const initSentry = (env: SentryEnv): boolean => {
  const options = buildSentryOptions(env)
  if (!options) return false
  Sentry.init(options)
  return true
}

// 5xx만 보고한다. 응답 헤더·에러 바디와 같은 requestId를 태그로 달아 로그와 이어준다
export const captureServerError = (exception: unknown, requestId: string): void => {
  if (!Sentry.isInitialized()) return
  Sentry.withScope((scope) => {
    scope.setTag('requestId', requestId)
    Sentry.captureException(exception)
  })
}
