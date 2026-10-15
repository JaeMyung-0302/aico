import { z } from 'zod'
import { cursorPage, cursorQuerySchema, idSchema } from './common'
import { userSummarySchema } from './user'

export const memberStateSchema = z.enum(['ACCEPTED', 'REQUEST'])
export type MemberState = z.infer<typeof memberStateSchema>

export const sendMessageRequestSchema = z
  .object({
    clientMessageId: z.string().min(8).max(64),
    body: z.string().trim().min(1).max(1000).optional(),
    mediaId: idSchema.optional(),
  })
  .refine((v) => Boolean(v.body) || Boolean(v.mediaId), {
    path: ['body'],
    message: '메시지 내용이나 사진이 필요해요',
  })
export type SendMessageRequest = z.infer<typeof sendMessageRequestSchema>

export const messageSchema = z.object({
  id: idSchema,
  conversationId: idSchema,
  senderId: idSchema.nullable(),
  body: z.string().nullable(),
  imageUrl: z.string().nullable(),
  clientMessageId: z.string(),
  createdAt: z.string(),
})
export type Message = z.infer<typeof messageSchema>

export const conversationSchema = z.object({
  id: idSchema,
  peer: userSummarySchema,
  state: memberStateSchema,
  lastMessage: messageSchema.nullable(),
  unreadCount: z.number().int(),
  // 상대가 마지막으로 읽은 메시지(읽음 표시). 상대가 아직 요청을 수락하지 않았으면 null
  peerLastReadMessageId: idSchema.nullable(),
})
export type Conversation = z.infer<typeof conversationSchema>

export const markReadRequestSchema = z.object({ lastReadMessageId: idSchema })
export type MarkReadRequest = z.infer<typeof markReadRequestSchema>

export const createConversationRequestSchema = z.object({ userId: idSchema })
export type CreateConversationRequest = z.infer<typeof createConversationRequestSchema>

// 대화 탭(ACCEPTED) / 메시지 요청함(REQUEST)
export const conversationListQuerySchema = cursorQuerySchema.extend({ state: memberStateSchema.default('ACCEPTED') })
export type ConversationListQuery = z.infer<typeof conversationListQuerySchema>

export const conversationPageSchema = cursorPage(conversationSchema)
export type ConversationPage = z.infer<typeof conversationPageSchema>

// cursor: 이 id보다 오래된 메시지(최신순) / after: 이 id 이후 메시지(오래된순, 재연결 시 놓친 메시지). 함께 쓸 수 없다
export const messageListQuerySchema = cursorQuerySchema
  .extend({ after: idSchema.optional() })
  .refine((v) => !(v.after && v.cursor), { path: ['after'], message: 'cursor와 after는 함께 쓸 수 없어요' })
export type MessageListQuery = z.infer<typeof messageListQuerySchema>

export const messagePageSchema = cursorPage(messageSchema)
export type MessagePage = z.infer<typeof messagePageSchema>

// socket.io (D5): 서버 → 클라 이벤트만. 쓰기는 REST
export const DM_SOCKET_PATH = '/socket.io'
export const DM_SOCKET_EVENTS = { messageNew: 'message:new', messageRead: 'message:read' } as const

export const messageReadEventSchema = z.object({
  conversationId: idSchema,
  userId: idSchema,
  lastReadMessageId: idSchema,
})
export type MessageReadEvent = z.infer<typeof messageReadEventSchema>

// 소켓 handshake 거부 사유(connect_error의 message). 보안 리뷰 LOW-2
export const DM_SOCKET_ERRORS = {
  unauthorized: 'UNAUTHORIZED',
  tooManyConnections: 'TOO_MANY_CONNECTIONS',
  rateLimited: 'RATE_LIMITED',
} as const

// 메시지 요청 스팸 방지(보안 리뷰 MEDIUM-1): 24시간 동안 새 요청(맞팔 아닌 상대에게 첫 메시지) 상한 → 429
export const DM_REQUEST_DAILY_LIMIT = 20
export const DM_REQUEST_LIMIT_CODE = 'DM_REQUEST_LIMIT'
