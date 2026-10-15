import {
  type Conversation,
  type ConversationPage,
  conversationPageSchema,
  conversationSchema,
  type MemberState,
  type Message,
  type MessagePage,
  messagePageSchema,
  messageSchema,
  type SendMessageRequest,
} from '@miri-pet/shared'
import { requestApi } from '@/shared/api/api-client'

const BASE = '/dm/conversations'
const cursorParams = (cursor: string | null) => (cursor ? { cursor } : {})

export const fetchConversations = (state: MemberState, cursor: string | null): Promise<ConversationPage> =>
  requestApi({ method: 'GET', url: BASE, params: { state, ...cursorParams(cursor) }, schema: conversationPageSchema })

export const fetchConversation = (conversationId: string): Promise<Conversation> =>
  requestApi({ method: 'GET', url: `${BASE}/${conversationId}`, schema: conversationSchema })

// 같은 상대와는 대화가 1개 — 이미 있으면 그 대화를 돌려준다
export const openConversation = (userId: string): Promise<Conversation> =>
  requestApi({ method: 'POST', url: BASE, data: { userId }, schema: conversationSchema })

export const acceptConversation = (conversationId: string): Promise<Conversation> =>
  requestApi({ method: 'POST', url: `${BASE}/${conversationId}/accept`, schema: conversationSchema })

// 나에게서 숨김(요청 거절 포함)
export const hideConversation = (conversationId: string): Promise<void> =>
  requestApi({ method: 'DELETE', url: `${BASE}/${conversationId}` })

export const fetchMessages = (conversationId: string, cursor: string | null): Promise<MessagePage> =>
  requestApi({
    method: 'GET',
    url: `${BASE}/${conversationId}/messages`,
    params: cursorParams(cursor),
    schema: messagePageSchema,
  })

// clientMessageId가 같으면 서버가 같은 메시지를 돌려준다(재시도 멱등)
export const sendMessage = (conversationId: string, request: SendMessageRequest): Promise<Message> =>
  requestApi({ method: 'POST', url: `${BASE}/${conversationId}/messages`, data: request, schema: messageSchema })

export const markConversationRead = (conversationId: string, lastReadMessageId: string): Promise<void> =>
  requestApi({ method: 'POST', url: `${BASE}/${conversationId}/read`, data: { lastReadMessageId } })
