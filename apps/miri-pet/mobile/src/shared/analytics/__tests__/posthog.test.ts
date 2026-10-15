import { createAnalytics, initAnalytics } from '../posthog'
import { setTracker, track } from '../track'

const createFakeClient = () => ({ capture: jest.fn(), identify: jest.fn(), reset: jest.fn() })

describe('createAnalytics', () => {
  it('userId가 정해지기 전 이벤트는 보내지 않는다 (익명 id 금지)', () => {
    const client = createFakeClient()
    const analytics = createAnalytics(client)
    analytics.tracker('place_viewed', { placeId: 'p1' })
    expect(client.capture).not.toHaveBeenCalled()
  })

  it('userId만으로 identify하고(속성 없음) 이후 이벤트를 보낸다', () => {
    const client = createFakeClient()
    const analytics = createAnalytics(client)
    analytics.setUserId('user-1')
    analytics.tracker('place_viewed', { placeId: 'p1' })
    expect(client.identify).toHaveBeenCalledWith('user-1')
    expect(client.capture).toHaveBeenCalledWith('place_viewed', { placeId: 'p1' })
  })

  it('같은 userId로 다시 호출하면 identify를 반복하지 않는다', () => {
    const client = createFakeClient()
    const analytics = createAnalytics(client)
    analytics.setUserId('user-1')
    analytics.setUserId('user-1')
    expect(client.identify).toHaveBeenCalledTimes(1)
  })

  it('로그아웃(null)이면 reset하고 다시 보내지 않는다', () => {
    const client = createFakeClient()
    const analytics = createAnalytics(client)
    analytics.setUserId('user-1')
    analytics.setUserId(null)
    analytics.tracker('onboarding_completed')
    expect(client.reset).toHaveBeenCalledTimes(1)
    expect(client.capture).not.toHaveBeenCalled()
  })

  it('처음부터 로그아웃 상태면 reset을 부르지 않는다', () => {
    const client = createFakeClient()
    createAnalytics(client).setUserId(null)
    expect(client.reset).not.toHaveBeenCalled()
  })
})

describe('initAnalytics', () => {
  afterEach(() => setTracker(() => undefined))

  it('API 키가 없으면 클라이언트를 만들지 않고 track은 no-op', () => {
    const createClient = jest.fn()
    expect(initAnalytics(undefined, undefined, createClient)).toBeNull()
    expect(initAnalytics('   ', undefined, createClient)).toBeNull()
    expect(createClient).not.toHaveBeenCalled()
    expect(() => track('onboarding_completed')).not.toThrow()
  })

  it('API 키가 있으면 클라이언트를 만들고 전역 track을 PostHog로 연결한다', () => {
    const client = createFakeClient()
    const createClient = jest.fn(() => client)
    const analytics = initAnalytics('phc_key', 'https://eu.i.posthog.com', createClient)
    expect(createClient).toHaveBeenCalledWith('phc_key', 'https://eu.i.posthog.com')
    analytics?.setUserId('user-1')
    track('onboarding_completed')
    expect(client.capture).toHaveBeenCalledWith('onboarding_completed', undefined)
  })

  it('host가 없으면 US 클라우드 기본값', () => {
    const createClient = jest.fn(() => createFakeClient())
    initAnalytics('phc_key', undefined, createClient)
    expect(createClient).toHaveBeenCalledWith('phc_key', 'https://us.i.posthog.com')
  })
})
