import type { Conversation, Message } from '@miri-pet/shared'
import { testId } from '@/modules/feed/__fixtures__/posts'

export const ME_ID = testId(900)
export const PEER = { id: testId(901), nickname: 'minsu_big3', avatarUrl: null }
export const CONVERSATION_ID = testId(950)

export const makeMessage = (overrides: Partial<Message> = {}): Message => ({
  id: testId(960),
  conversationId: CONVERSATION_ID,
  senderId: PEER.id,
  body: '테라스면 콩이도 갈 수 있겠네요!',
  imageUrl: null,
  clientMessageId: 'client-0001',
  createdAt: '2026-10-15T05:10:00.000Z',
  ...overrides,
})

export const makeConversation = (overrides: Partial<Conversation> = {}): Conversation => ({
  id: CONVERSATION_ID,
  peer: PEER,
  state: 'ACCEPTED',
  lastMessage: makeMessage(),
  unreadCount: 0,
  peerLastReadMessageId: null,
  ...overrides,
})
