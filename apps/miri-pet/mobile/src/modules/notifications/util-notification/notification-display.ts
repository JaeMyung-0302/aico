import type { Notification } from '@miri-pet/shared'
import type { Href } from 'expo-router'

const KST_OFFSET_MS = 9 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000

export type NotificationSection = '오늘' | '이번 주' | '이전'

// 07 문구 (인앱 알림함용 — 푸시 문구와 같은 톤)
export const notificationText = ({ kind, actor, preview }: Notification): string => {
  const name = actor?.nickname ?? '알 수 없는 사용자'
  if (kind === 'LIKE') return `${name}님이 게시물을 좋아해요`
  if (kind === 'COMMENT') return preview ? `${name}님이 댓글을 남겼어요: ${preview}` : `${name}님이 댓글을 남겼어요`
  if (kind === 'FOLLOW') return `${name}님이 회원님을 팔로우해요`
  if (kind === 'DM_REQUEST') return `${name}님이 메시지 요청을 보냈어요`
  if (kind === 'VACCINATION_DUE') return '다가오는 접종일이 있어요. 증명서도 함께 챙겨두세요'
  return '제보해 주신 장소 정보가 반영됐어요'
}

// 눌렀을 때 이동할 곳. 대상이 사라졌으면(postId null) 이동하지 않는다
export const notificationHref = ({ kind, actor, postId }: Notification): Href | null => {
  if ((kind === 'LIKE' || kind === 'COMMENT') && postId) return `/posts/${postId}`
  if (kind === 'FOLLOW' && actor) return `/users/${actor.id}`
  // 대화 탭의 "요청" 세그먼트로 연다 (app/(tabs)/dm.tsx가 tab 파라미터를 읽는다)
  if (kind === 'DM_REQUEST') return '/dm?tab=requests'
  if (kind === 'VACCINATION_DUE') return '/pets'
  return null
}

const kstDayNumber = (date: Date) => Math.floor((date.getTime() + KST_OFFSET_MS) / DAY_MS)

// KST 날짜 기준: 오늘 / 최근 7일 / 이전
export const notificationSection = (createdAt: string, now: Date = new Date()): NotificationSection => {
  const days = kstDayNumber(now) - kstDayNumber(new Date(createdAt))
  if (days <= 0) return '오늘'
  return days < 7 ? '이번 주' : '이전'
}
