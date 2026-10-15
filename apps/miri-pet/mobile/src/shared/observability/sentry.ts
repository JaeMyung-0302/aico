import * as Sentry from '@sentry/react-native'

export type SentryOptions = {
  dsn: string
  environment: string
  sendDefaultPii: false
  tracesSampleRate: number
}

// D11: EXPO_PUBLIC_SENTRY_DSN이 비면(개발·테스트) null → Sentry를 켜지 않는다. 개인정보는 보내지 않는다
export const buildSentryOptions = (dsn: string | undefined, environment: string | undefined): SentryOptions | null => {
  const trimmed = dsn?.trim()
  if (!trimmed) return null
  return { dsn: trimmed, environment: environment || 'production', sendDefaultPii: false, tracesSampleRate: 0 }
}

export const initSentry = (dsn: string | undefined, environment: string | undefined): boolean => {
  const options = buildSentryOptions(dsn, environment)
  if (!options) return false
  Sentry.init(options)
  return true
}
