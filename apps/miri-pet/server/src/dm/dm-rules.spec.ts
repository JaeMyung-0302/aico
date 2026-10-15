import {
  conversationListQuerySchema,
  DM_SOCKET_EVENTS,
  DM_SOCKET_PATH,
  messageListQuerySchema,
  sendMessageRequestSchema,
} from '@miri-pet/shared'
import { DM_PUSH_BODY, orderPair, userRoom } from './dm-rules'
import { extractSocketToken } from './socket-auth'

const LOW = '0199e3a0-0000-7000-8000-000000000001'
const HIGH = '0199e3a0-0000-7000-8000-000000000002'

describe('DM 규칙', () => {
  it('두 사용자 id를 정렬해 low/high로 저장한다(쌍당 1개)', () => {
    expect(orderPair(HIGH, LOW)).toEqual({ userLowId: LOW, userHighId: HIGH })
    expect(orderPair(LOW, HIGH)).toEqual({ userLowId: LOW, userHighId: HIGH })
  })

  it('사용자별 room 이름', () => {
    expect(userRoom(LOW)).toBe(`user:${LOW}`)
  })

  it('푸시 본문은 메시지 미리보기 없이 고정 문구(보안 리뷰 LOW-6: 잠금 화면 노출 방지)', () => {
    expect(DM_PUSH_BODY).toBe('새 메시지가 왔어요')
  })
})

describe('socket handshake 토큰', () => {
  it('auth.token을 우선, 없으면 Authorization Bearer 헤더', () => {
    expect(extractSocketToken({ auth: { token: 'abc' }, headers: {} })).toBe('abc')
    expect(extractSocketToken({ auth: {}, headers: { authorization: 'Bearer xyz' } })).toBe('xyz')
    expect(extractSocketToken({ auth: { token: 42 }, headers: { authorization: 'Basic q' } })).toBeNull()
    expect(extractSocketToken({ auth: { token: '' }, headers: {} })).toBeNull()
  })
})

describe('DM 공유 계약', () => {
  it('소켓 경로·이벤트 이름', () => {
    expect(DM_SOCKET_PATH).toBe('/socket.io')
    expect(DM_SOCKET_EVENTS).toEqual({ messageNew: 'message:new', messageRead: 'message:read' })
  })

  it('목록 state 기본값은 ACCEPTED, 알 수 없는 state는 거부', () => {
    expect(conversationListQuerySchema.parse({})).toMatchObject({ state: 'ACCEPTED', limit: 20 })
    expect(conversationListQuerySchema.safeParse({ state: 'BLOCKED' }).success).toBe(false)
  })

  it('메시지 목록은 cursor(이전)와 after(이후)를 함께 쓸 수 없다', () => {
    expect(messageListQuerySchema.safeParse({ after: LOW }).success).toBe(true)
    expect(messageListQuerySchema.safeParse({ after: LOW, cursor: HIGH }).success).toBe(false)
  })

  it('전송: 본문이나 사진 중 하나는 있어야 하고 clientMessageId는 8~64자', () => {
    expect(sendMessageRequestSchema.safeParse({ clientMessageId: 'abcdefgh', body: 'hi' }).success).toBe(true)
    expect(sendMessageRequestSchema.safeParse({ clientMessageId: 'abcdefgh' }).success).toBe(false)
    expect(sendMessageRequestSchema.safeParse({ clientMessageId: 'short', body: 'hi' }).success).toBe(false)
  })
})
