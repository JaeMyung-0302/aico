import type { UserSummary } from '@miri-pet/shared'

export const DELETED_USER_NICKNAME = '탈퇴한 사용자'

type AvatarMedia = { key: string; status: string } | null

export type UserSummarySource = { id: string; nickname: string | null; avatarMedia: AvatarMedia }

export const USER_SUMMARY_SELECT = {
  id: true,
  nickname: true,
  avatarMedia: { select: { key: true, status: true } },
} as const

// 공개 버킷 이미지 URL. 처리 완료(READY)된 미디어만 노출한다
export const publicMediaUrl = (baseUrl: string, media: AvatarMedia): string | null =>
  media && media.status === 'READY' ? `${baseUrl}/${media.key}` : null

export const toUserSummary = (user: UserSummarySource, baseUrl: string): UserSummary => ({
  id: user.id,
  nickname: user.nickname ?? DELETED_USER_NICKNAME,
  avatarUrl: publicMediaUrl(baseUrl, user.avatarMedia),
})
