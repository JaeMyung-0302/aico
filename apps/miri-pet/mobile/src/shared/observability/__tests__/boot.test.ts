import * as Sentry from '@sentry/react-native'

jest.mock('@sentry/react-native', () => ({ init: jest.fn() }))

describe('observability boot (키 없음)', () => {
  it('EXPO_PUBLIC_SENTRY_DSN·POSTHOG 키가 없으면 둘 다 꺼진 채로 로드된다', () => {
    delete process.env.EXPO_PUBLIC_SENTRY_DSN
    delete process.env.EXPO_PUBLIC_POSTHOG_API_KEY
    jest.isolateModules(() => {
      const boot = jest.requireActual<typeof import('../boot')>('../boot')
      expect(boot.isSentryEnabled).toBe(false)
      expect(boot.analytics).toBeNull()
    })
    expect(jest.mocked(Sentry.init)).not.toHaveBeenCalled()
  })
})
