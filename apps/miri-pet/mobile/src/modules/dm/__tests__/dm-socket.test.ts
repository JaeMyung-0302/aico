import { DM_SOCKET_EVENTS, DM_SOCKET_PATH } from '@miri-pet/shared'
import { createTestQueryClient } from '@/test-utils/QueryTestProvider'
import { CONVERSATION_ID, makeConversation, makeMessage } from '../__fixtures__/dm'
import { conversationQueryKey, DM_QUERY_KEY } from '../data-access-dm/query-keys'
import {
  bindDmReconnect,
  bindDmSocketEvents,
  connectDmSocket,
  type DmSocketOptions,
  socketOrigin,
} from '../util-socket/socket'

type Listener = (payload?: unknown) => void

// socket.io-client 대역: 등록된 리스너를 이벤트 이름으로 직접 부른다
const createFakeSocket = () => {
  const listeners = new Map<string, Listener[]>()
  return {
    on: jest.fn((event: string, listener: Listener) => {
      listeners.set(event, [...(listeners.get(event) ?? []), listener])
    }),
    off: jest.fn(),
    disconnect: jest.fn(),
    connect: jest.fn(),
    emitLocal: (event: string, payload?: unknown) => (listeners.get(event) ?? []).forEach((fn) => fn(payload)),
  }
}

describe('DM 소켓', () => {
  it('API 주소에서 소켓 origin을 만든다(/api/v1 제외)', () => {
    expect(socketOrigin('http://localhost:4008/api/v1')).toBe('http://localhost:4008')
    expect(socketOrigin('https://api.aico-app.com/miripet/api/v1')).toBe('https://api.aico-app.com')
  })

  it('경로 /socket.io·websocket 전송·auth 콜백으로 최신 access token을 보낸다', async () => {
    const socket = createFakeSocket()
    const io = jest.fn((_origin: string, _options: DmSocketOptions) => socket)
    const getAccessToken = jest.fn(async () => 'access-1')
    connectDmSocket({ io, origin: 'http://localhost:4008', getAccessToken })
    expect(io).toHaveBeenCalledWith(
      'http://localhost:4008',
      expect.objectContaining({ path: DM_SOCKET_PATH, transports: ['websocket'], auth: expect.any(Function) }),
    )
    const options = io.mock.calls[0]?.[1]
    const auth = await new Promise((resolve) => options?.auth(resolve))
    expect(auth).toEqual({ token: 'access-1' })
  })

  it('(재)연결·새 메시지 → DM 캐시를 다시 받는다(놓친 메시지 복구)', () => {
    const socket = createFakeSocket()
    const client = createTestQueryClient()
    const invalidate = jest.spyOn(client, 'invalidateQueries')
    bindDmSocketEvents(socket, client)
    socket.emitLocal('connect')
    expect(invalidate).toHaveBeenLastCalledWith({ queryKey: DM_QUERY_KEY })
    socket.emitLocal(DM_SOCKET_EVENTS.messageNew, makeMessage())
    expect(invalidate).toHaveBeenCalledTimes(2)
  })

  it('읽음 이벤트 → 열린 대화의 peerLastReadMessageId를 바로 갱신한다', () => {
    const socket = createFakeSocket()
    const client = createTestQueryClient()
    client.setQueryData(conversationQueryKey(CONVERSATION_ID), makeConversation())
    bindDmSocketEvents(socket, client)
    const lastReadMessageId = '0199e3a0-0000-7000-8000-000000000961'
    socket.emitLocal(DM_SOCKET_EVENTS.messageRead, {
      conversationId: CONVERSATION_ID,
      userId: '0199e3a0-0000-7000-8000-000000000901',
      lastReadMessageId,
    })
    expect(client.getQueryData(conversationQueryKey(CONVERSATION_ID))).toMatchObject({
      peerLastReadMessageId: lastReadMessageId,
    })
    // 형식이 틀린 이벤트는 무시한다
    socket.emitLocal(DM_SOCKET_EVENTS.messageRead, { conversationId: 1 })
  })

  it('handshake 거부·서버가 끊은 연결(토큰 만료·로그아웃)만 재시도한다. 앱이 끊은 경우·네트워크 끊김은 socket.io가 맡는다', () => {
    const socket = createFakeSocket()
    const retry = jest.fn()
    bindDmReconnect(socket, retry)
    socket.emitLocal('connect_error', new Error('TOO_MANY_CONNECTIONS'))
    expect(retry).toHaveBeenCalledTimes(1)
    socket.emitLocal('disconnect', 'io server disconnect')
    expect(retry).toHaveBeenCalledTimes(2)
    socket.emitLocal('disconnect', 'io client disconnect')
    socket.emitLocal('disconnect', 'transport close')
    expect(retry).toHaveBeenCalledTimes(2)
  })
})
