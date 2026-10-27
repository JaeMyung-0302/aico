import * as Sentry from '@sentry/react-native'

jest.mock('@sentry/react-native', () => ({ init: jest.fn() }))

describe('observability boot (키 없음)', () => {
  it('EXPO_PUBLIC_SENTRY_DSN이 없으면 꺼진 채로 로드된다', () => {
    delete process.env.EXPO_PUBLIC_SENTRY_DSN
    jest.isolateModules(() => {
      const boot = jest.requireActual<typeof import('../boot')>('../boot')
      expect(boot.isSentryEnabled).toBe(false)
    })
    expect(jest.mocked(Sentry.init)).not.toHaveBeenCalled()
  })
})
