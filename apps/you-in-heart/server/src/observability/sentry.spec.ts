import * as SentryModule from '@sentry/nestjs'
import { buildSentryOptions, captureServerError, initSentry, scrubEvent } from './sentry'

const mockCaptureException = jest.fn()
const mockSetTag = jest.fn()

jest.mock('@sentry/nestjs', () => ({
  init: jest.fn(),
  isInitialized: jest.fn(),
  withScope: (callback: (scope: { setTag: typeof mockSetTag }) => void) => callback({ setTag: mockSetTag }),
  captureException: (...args: unknown[]) => mockCaptureException(...args),
}))

const Sentry = { init: jest.mocked(SentryModule.init), isInitialized: jest.mocked(SentryModule.isInitialized) }

describe('buildSentryOptions', () => {
  it('returns null when SENTRY_DSN is missing or blank', () => {
    expect(buildSentryOptions({})).toBeNull()
    expect(buildSentryOptions({ SENTRY_DSN: '   ' })).toBeNull()
  })

  it('builds options without PII and with tracing off by default', () => {
    const options = buildSentryOptions({ SENTRY_DSN: 'https://k@o1.ingest.sentry.io/1', NODE_ENV: 'production' })
    expect(options).toEqual({
      dsn: 'https://k@o1.ingest.sentry.io/1',
      environment: 'production',
      tracesSampleRate: 0,
      sendDefaultPii: false,
      beforeSend: scrubEvent,
    })
  })

  it('uses SENTRY_ENVIRONMENT, SENTRY_RELEASE and a valid SENTRY_TRACES_SAMPLE_RATE', () => {
    const options = buildSentryOptions({
      SENTRY_DSN: 'https://k@o1.ingest.sentry.io/1',
      SENTRY_ENVIRONMENT: 'staging',
      SENTRY_RELEASE: 'abc123',
      SENTRY_TRACES_SAMPLE_RATE: '0.2',
    })
    expect(options).toMatchObject({ environment: 'staging', release: 'abc123', tracesSampleRate: 0.2 })
  })

  it('falls back to 0 for an out-of-range or invalid sample rate', () => {
    const dsn = 'https://k@o1.ingest.sentry.io/1'
    expect(buildSentryOptions({ SENTRY_DSN: dsn, SENTRY_TRACES_SAMPLE_RATE: '2' })?.tracesSampleRate).toBe(0)
    expect(buildSentryOptions({ SENTRY_DSN: dsn, SENTRY_TRACES_SAMPLE_RATE: 'abc' })?.tracesSampleRate).toBe(0)
  })
})

describe('initSentry', () => {
  beforeEach(() => jest.clearAllMocks())

  it('does not call Sentry.init when unconfigured', () => {
    expect(initSentry({})).toBe(false)
    expect(Sentry.init).not.toHaveBeenCalled()
  })

  it('calls Sentry.init once with the built options when SENTRY_DSN is set', () => {
    expect(initSentry({ SENTRY_DSN: 'https://k@o1.ingest.sentry.io/1' })).toBe(true)
    expect(Sentry.init).toHaveBeenCalledTimes(1)
    expect(Sentry.init).toHaveBeenCalledWith(expect.objectContaining({ dsn: 'https://k@o1.ingest.sentry.io/1' }))
  })
})

describe('captureServerError', () => {
  beforeEach(() => jest.clearAllMocks())

  it('is a no-op when Sentry is not initialized', () => {
    Sentry.isInitialized.mockReturnValue(false)
    captureServerError(new Error('boom'), 'req-1')
    expect(mockCaptureException).not.toHaveBeenCalled()
  })

  it('captures the exception with a requestId tag when initialized', () => {
    Sentry.isInitialized.mockReturnValue(true)
    const error = new Error('boom')
    captureServerError(error, 'req-1')
    expect(mockSetTag).toHaveBeenCalledWith('requestId', 'req-1')
    expect(mockCaptureException).toHaveBeenCalledWith(error)
  })
})

// 일기 본문·좌표·사진 URL이 에러 리포트로 새지 않게 키 이름 기준으로 지운다
describe('scrubEvent', () => {
  it.each(['lat', 'lng', 'uri', 'url', 'body', 'text'])('키 %s의 값은 깊이와 상관없이 [Filtered]로 바꾼다', (key) => {
    const event = {
      extra: { [key]: 'secret', nested: { list: [{ [key]: 37.5 }] } },
      breadcrumbs: [{ category: 'http', data: { [key]: 'https://r2/x?sig=1' } }],
    }
    const scrubbed = scrubEvent(event)
    expect(scrubbed.extra).toEqual({ [key]: '[Filtered]', nested: { list: [{ [key]: '[Filtered]' }] } })
    expect(scrubbed.breadcrumbs?.[0]?.data).toEqual({ [key]: '[Filtered]' })
  })

  it('대소문자가 달라도 지운다', () => {
    expect(scrubEvent({ extra: { Body: '일기', LAT: 1 } }).extra).toEqual({ Body: '[Filtered]', LAT: '[Filtered]' })
  })

  it('요청 본문(data)과 query string은 통째로 빼고, 다른 필드는 그대로 둔다', () => {
    const scrubbed = scrubEvent({
      message: 'boom',
      tags: { requestId: 'req-1' },
      request: { method: 'POST', url: 'https://api/x?lat=1', data: { title: '제주' }, query_string: 'lat=1' },
    })
    expect(scrubbed.message).toBe('boom')
    expect(scrubbed.tags).toEqual({ requestId: 'req-1' })
    expect(scrubbed.request).toEqual({ method: 'POST', url: '[Filtered]' })
  })

  it('원본 이벤트를 바꾸지 않는다', () => {
    const event = { extra: { body: '일기' } }
    scrubEvent(event)
    expect(event.extra.body).toBe('일기')
  })
})
