import {
  type Conversation,
  DM_SOCKET_EVENTS,
  DM_SOCKET_PATH,
  messageReadEventSchema,
} from '@miri-pet/shared'
import type { QueryClient } from '@tanstack/react-query'
import { catchUpMessages, isMessagesQueryKey } from '../data-access-dm/catch-up-messages'
import { conversationQueryKey, DM_QUERY_KEY } from '../data-access-dm/query-keys'

type AuthData = { token?: string }

export type DmSocketOptions = {
  path: string
  transports: string[]
  // 연결·재연결 때마다 불린다 → refresh된 최신 access token을 보낸다
  auth: (callback: (data: AuthData) => void) => void
}

export type DmSocketLike = {
  on: (event: string, listener: (payload?: unknown) => void) => unknown
}

// http(s)://host[:port] 만 남긴다 (RN의 URL 폴리필은 origin을 지원하지 않는다)
export const socketOrigin = (apiBaseUrl: string): string => /^(https?:\/\/[^/]+)/i.exec(apiBaseUrl)?.[1] ?? apiBaseUrl

type ConnectOptions<T> = {
  io: (origin: string, options: DmSocketOptions) => T
  origin: string
  getAccessToken: () => Promise<string | null>
}

// D5: 소켓은 서버 → 앱 알림 전용. API와 같은 호스트·포트의 /socket.io
export const connectDmSocket = <T>({ io, origin, getAccessToken }: ConnectOptions<T>): T =>
  io(origin, {
    path: DM_SOCKET_PATH,
    transports: ['websocket'],
    auth: (callback) => {
      getAccessToken()
        .then((token) => callback(token ? { token } : {}))
        .catch(() => callback({}))
    },
  })

// 새 메시지 → ['dm'] 재조회. (재)연결 → 열린 대화는 after 커서로 놓친 메시지만 받아 합치고 나머지 DM 캐시는 재조회.
// 읽음 → 열린 대화의 읽음 위치만 바로 바꾼다
export const bindDmSocketEvents = (socket: DmSocketLike, queryClient: QueryClient): void => {
  const refetchDm = () => {
    queryClient.invalidateQueries({ queryKey: DM_QUERY_KEY }).catch(() => undefined)
  }
  const recoverDm = () => {
    catchUpMessages(queryClient).catch(() => undefined)
    queryClient
      .invalidateQueries({ queryKey: DM_QUERY_KEY, predicate: (query) => !isMessagesQueryKey(query.queryKey) })
      .catch(() => undefined)
  }
  socket.on('connect', recoverDm)
  socket.on(DM_SOCKET_EVENTS.messageNew, refetchDm)
  socket.on(DM_SOCKET_EVENTS.messageRead, (payload) => {
    const parsed = messageReadEventSchema.safeParse(payload)
    if (!parsed.success) return
    const { conversationId, lastReadMessageId } = parsed.data
    queryClient.setQueryData<Conversation>(conversationQueryKey(conversationId), (current) =>
      current ? { ...current, peerLastReadMessageId: lastReadMessageId } : current,
    )
  })
}

// 서버가 끊은 연결(access token 만료 시각·로그아웃·정지)과 handshake 거부는 socket.io가 자동 재연결하지 않는다 → retry가 맡는다.
// 앱이 끊은 경우('io client disconnect')·네트워크 끊김('transport close' 등)은 socket.io 기본 재연결에 맡긴다
const SERVER_DISCONNECT_REASON = 'io server disconnect'

export const bindDmReconnect = (socket: DmSocketLike, retry: () => void): void => {
  socket.on('connect_error', retry)
  socket.on('disconnect', (reason) => {
    if (reason === SERVER_DISCONNECT_REASON) retry()
  })
}
