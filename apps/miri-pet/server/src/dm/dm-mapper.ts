import type { Conversation, Message } from '@miri-pet/shared'
import { toUserSummary, USER_SUMMARY_SELECT, type UserSummarySource } from '../common/user-summary'
import type { MediaBucket, MediaStatus, MemberState } from '../generated/prisma'
import { publicUrlsOf } from '../media/media-keys'

export const MESSAGE_SELECT = {
  id: true,
  conversationId: true,
  senderId: true,
  body: true,
  clientMessageId: true,
  createdAt: true,
  media: { select: { id: true, bucket: true, key: true, status: true } },
} as const

type MessageRow = {
  id: string
  conversationId: string
  senderId: string | null
  body: string | null
  clientMessageId: string
  createdAt: Date
  media: { id: string; bucket: MediaBucket; key: string; status: MediaStatus } | null
}

export const toMessageDto = (row: MessageRow, baseUrl: string): Message => ({
  id: row.id,
  conversationId: row.conversationId,
  senderId: row.senderId,
  body: row.body,
  imageUrl: row.media ? publicUrlsOf(baseUrl, row.media).url : null,
  clientMessageId: row.clientMessageId,
  createdAt: row.createdAt.toISOString(),
})

// 내 멤버 행 기준 조회: 대화 양쪽 사용자·멤버 상태·마지막(숨김 제외) 메시지
export const MEMBER_CONVERSATION_SELECT = {
  state: true,
  conversation: {
    select: {
      id: true,
      userLowId: true,
      userLow: { select: USER_SUMMARY_SELECT },
      userHigh: { select: USER_SUMMARY_SELECT },
      members: { select: { userId: true, state: true, lastReadMessageId: true } },
      messages: { where: { hiddenAt: null }, orderBy: { id: 'desc' }, take: 1, select: MESSAGE_SELECT },
    },
  },
} as const

export type MemberConversationRow = {
  state: MemberState
  conversation: {
    id: string
    userLowId: string
    userLow: UserSummarySource
    userHigh: UserSummarySource
    members: Array<{ userId: string; state: MemberState; lastReadMessageId: string | null }>
    messages: MessageRow[]
  }
}

export const peerOf = (row: MemberConversationRow, viewerId: string): UserSummarySource =>
  row.conversation.userLowId === viewerId ? row.conversation.userHigh : row.conversation.userLow

export const toConversationDto = (
  row: MemberConversationRow,
  viewerId: string,
  unreadCount: number,
  baseUrl: string,
): Conversation => {
  const peer = peerOf(row, viewerId)
  const peerMember = row.conversation.members.find((member) => member.userId === peer.id)
  const lastMessage = row.conversation.messages[0]
  return {
    id: row.conversation.id,
    peer: toUserSummary(peer, baseUrl),
    state: row.state,
    lastMessage: lastMessage ? toMessageDto(lastMessage, baseUrl) : null,
    unreadCount,
    // 요청을 아직 수락하지 않은 상대의 읽음 여부는 보여주지 않는다(DmInbox 안내 문구)
    peerLastReadMessageId: peerMember?.state === 'ACCEPTED' ? peerMember.lastReadMessageId : null,
  }
}
