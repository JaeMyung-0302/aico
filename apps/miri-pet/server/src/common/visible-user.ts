import { NotFoundException } from '@nestjs/common'

// 다른 사용자에게 "존재하는" 사용자의 조건. 이 밖(없음·정지·탈퇴·신고 숨김)은 모두 같은 404로 응답해 상태를 노출하지 않는다
export const VISIBLE_USER_WHERE = { status: 'ACTIVE', hiddenAt: null } as const

// viewer에게 보이는 사용자: VISIBLE_USER_WHERE + viewer와 차단 관계(양방향) 아님. viewer를 모르면 VISIBLE_USER_WHERE
export const visibleUserWhereFor = (viewerId?: string) =>
  viewerId
    ? {
        ...VISIBLE_USER_WHERE,
        blocking: { none: { blockedId: viewerId } },
        blockedBy: { none: { blockerId: viewerId } },
      }
    : VISIBLE_USER_WHERE

export const USER_NOT_FOUND_MESSAGE = '사용자를 찾을 수 없어요'

export const userNotFound = (): NotFoundException => new NotFoundException(USER_NOT_FOUND_MESSAGE)
