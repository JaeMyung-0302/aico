import type { Notification } from '@miri-pet/shared'
import { notificationHref, notificationSection, notificationText } from '../util-notification/notification-display'

const ACTOR = { id: '0199e3a0-0000-7000-8000-000000000007', nickname: '호두맘', avatarUrl: null }
const base: Notification = {
  id: '0199e3a0-0000-7000-8000-000000000800',
  kind: 'LIKE',
  actor: ACTOR,
  refId: null,
  postId: '0199e3a0-0000-7000-8000-000000000070',
  thumbUrl: null,
  preview: null,
  readAt: null,
  createdAt: '2026-10-15T01:00:00.000Z',
}

describe('알림 표시 규칙', () => {
  it.each([
    [{ kind: 'COMMENT' as const, preview: null }, '호두맘님이 댓글을 남겼어요'],
    [{ kind: 'DM_REQUEST' as const }, '호두맘님이 메시지 요청을 보냈어요'],
    [{ kind: 'PLACE_REPORT_REVIEWED' as const, actor: null }, '제보해 주신 장소 정보가 반영됐어요'],
    [{ kind: 'LIKE' as const, actor: null }, '알 수 없는 사용자님이 게시물을 좋아해요'],
  ])('%o → %s', (patch, expected) => {
    expect(notificationText({ ...base, ...patch })).toBe(expected)
  })

  it('이동: 사라진 게시물·장소 제보는 이동 안 함, DM 요청 → 대화, 접종 → 내 펫', () => {
    expect(notificationHref({ ...base, postId: null })).toBeNull()
    expect(notificationHref({ ...base, kind: 'PLACE_REPORT_REVIEWED' })).toBeNull()
    expect(notificationHref({ ...base, kind: 'DM_REQUEST' })).toBe('/dm')
    expect(notificationHref({ ...base, kind: 'VACCINATION_DUE' })).toBe('/pets')
    expect(notificationHref({ ...base, kind: 'FOLLOW', actor: null })).toBeNull()
  })

  it('구역은 KST 날짜 기준', () => {
    const now = new Date('2026-10-15T00:30:00+09:00')
    expect(notificationSection('2026-10-14T15:10:00.000Z', now)).toBe('오늘')
    expect(notificationSection('2026-10-14T14:50:00.000Z', now)).toBe('이번 주')
    expect(notificationSection('2026-10-07T14:50:00.000Z', now)).toBe('이전')
  })
})
