import { eventPropsSchema, FORBIDDEN_EVENT_PROP_KEYS, trackEventRequestSchema } from '../event'

describe('event schema', () => {
  it('허용된 이름과 단순 props를 통과시킨다', () => {
    const parsed = trackEventRequestSchema.parse({ name: 'memory_created', props: { type: 'diary', photoCount: 3 } })
    expect(parsed).toEqual({ name: 'memory_created', props: { type: 'diary', photoCount: 3 } })
  })

  it('props가 없으면 빈 객체', () => {
    expect(trackEventRequestSchema.parse({ name: 'app_open' }).props).toEqual({})
  })

  it('모르는 이벤트 이름은 거부', () => {
    expect(trackEventRequestSchema.safeParse({ name: 'question_answered', props: {} }).success).toBe(false)
  })

  it('금지 키 목록은 lat, lng, url, uri, body, text', () => {
    expect([...FORBIDDEN_EVENT_PROP_KEYS]).toEqual(['lat', 'lng', 'url', 'uri', 'body', 'text'])
  })

  it.each(['lat', 'lng', 'url', 'uri', 'body', 'text', 'LAT', 'Body', ' url '])('금지 키 "%s"를 거부', (key) => {
    expect(eventPropsSchema.safeParse({ [key]: 'x' }).success).toBe(false)
    expect(trackEventRequestSchema.safeParse({ name: 'memory_viewed', props: { [key]: 1 } }).success).toBe(false)
  })

  it('객체·배열 값은 거부(중첩으로 금지 키를 숨길 수 없다)', () => {
    expect(eventPropsSchema.safeParse({ meta: { lat: 37.5 } }).success).toBe(false)
    expect(eventPropsSchema.safeParse({ list: [1, 2] }).success).toBe(false)
  })

  it('긴 문자열 값은 거부(본문 유입 차단)', () => {
    expect(eventPropsSchema.safeParse({ type: 'x'.repeat(101) }).success).toBe(false)
  })
})
