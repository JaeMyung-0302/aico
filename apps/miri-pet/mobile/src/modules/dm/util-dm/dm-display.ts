import type { Message, Post } from '@miri-pet/shared'

// 12 목록 미리보기
export const conversationPreview = (message: Message | null, meId: string | undefined): string => {
  if (!message) return ''
  const text = message.body ?? (message.imageUrl ? '사진' : null)
  if (!text) return '삭제된 메시지예요'
  return message.senderId !== null && message.senderId === meId ? `나: ${text}` : text
}

// 13 내 메시지 아래 읽음 표시. uuid v7은 시간순이라 문자열 비교로 순서를 안다
export const myReadLabel = (message: Pick<Message, 'id'>, peerLastReadMessageId: string | null): '읽음' | '전송됨' =>
  peerLastReadMessageId !== null && message.id <= peerLastReadMessageId ? '읽음' : '전송됨'

// 게시물 공유(04 PostCard → DM): 앱 링크를 본문에 넣고, 말풍선이 다시 읽어 게시물로 이동한다
const POST_LINK = /miripet:\/\/posts\/([0-9a-f-]{36})/i
const CAPTION_MAX = 30

export const postShareBody = (post: Pick<Post, 'id' | 'author' | 'caption'>): string => {
  const caption = post.caption ? post.caption.slice(0, CAPTION_MAX) : ''
  const title = caption ? `${post.author.nickname}님의 게시물: ${caption}` : `${post.author.nickname}님의 게시물`
  return `${title}\nmiripet://posts/${post.id}`
}

export const parsePostShare = (body: string | null): string | null => (body ? (POST_LINK.exec(body)?.[1] ?? null) : null)

// 서버 계약 8~64자. 같은 기기에서 겹치지 않으면 충분하다(서버 유니크 = 보낸 사람 + clientMessageId)
export const createClientMessageId = (): string =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12).padEnd(10, '0')}`
