import * as Sentry from '@sentry/react-native'
import { buildSentryOptions, initSentry } from '../sentry'

jest.mock('@sentry/react-native', () => ({ init: jest.fn() }))

const mockedInit = jest.mocked(Sentry.init)

describe('buildSentryOptions', () => {
  it('DSN이 없거나 공백이면 null', () => {
    expect(buildSentryOptions(undefined, undefined)).toBeNull()
    expect(buildSentryOptions('  ', 'production')).toBeNull()
  })

  it('개인정보 전송 없이, 트레이싱은 끈 옵션을 만든다', () => {
    expect(buildSentryOptions('https://k@o1.ingest.sentry.io/1', 'preview')).toEqual({
      dsn: 'https://k@o1.ingest.sentry.io/1',
      environment: 'preview',
      sendDefaultPii: false,
      tracesSampleRate: 0,
    })
  })

  it('환경 이름이 없으면 production', () => {
    expect(buildSentryOptions('https://k@o1.ingest.sentry.io/1', undefined)?.environment).toBe('production')
  })
})

describe('initSentry', () => {
  beforeEach(() => mockedInit.mockClear())

  it('DSN이 없으면 Sentry.init을 부르지 않는다', () => {
    expect(initSentry(undefined, undefined)).toBe(false)
    expect(mockedInit).not.toHaveBeenCalled()
  })

  it('DSN이 있으면 Sentry.init을 1회 부른다', () => {
    expect(initSentry('https://k@o1.ingest.sentry.io/1', 'production')).toBe(true)
    expect(mockedInit).toHaveBeenCalledTimes(1)
    expect(mockedInit).toHaveBeenCalledWith(expect.objectContaining({ dsn: 'https://k@o1.ingest.sentry.io/1' }))
  })
})
