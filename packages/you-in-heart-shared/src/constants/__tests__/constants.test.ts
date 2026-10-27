import { EVENT_NAMES } from '../events'
import {
  DISPLAY_LONG_EDGE,
  INVITE_CODE_ALPHABET,
  INVITE_CODE_LENGTH,
  INVITE_TTL_HOURS,
  MAX_PHOTOS_PER_ENTRY,
  MAX_QUOTES_PER_BULK,
  THUMB_LONG_EDGE,
  UNLINK_GRACE_DAYS,
} from '../limits'

describe('limits', () => {
  it('계획서 값과 같다', () => {
    expect({
      MAX_PHOTOS_PER_ENTRY,
      INVITE_CODE_LENGTH,
      INVITE_TTL_HOURS,
      UNLINK_GRACE_DAYS,
      DISPLAY_LONG_EDGE,
      THUMB_LONG_EDGE,
      MAX_QUOTES_PER_BULK,
    }).toEqual({
      MAX_PHOTOS_PER_ENTRY: 20,
      INVITE_CODE_LENGTH: 6,
      INVITE_TTL_HOURS: 24,
      UNLINK_GRACE_DAYS: 30,
      DISPLAY_LONG_EDGE: 2048,
      THUMB_LONG_EDGE: 400,
      MAX_QUOTES_PER_BULK: 200,
    })
  })

  it('초대 코드 알파벳은 혼동 문자(I, O, 0, 1)가 없고 중복이 없다', () => {
    expect(INVITE_CODE_ALPHABET).toBe('ABCDEFGHJKLMNPQRSTUVWXYZ23456789')
    expect(INVITE_CODE_ALPHABET).not.toMatch(/[IO01]/)
    expect(new Set(INVITE_CODE_ALPHABET).size).toBe(INVITE_CODE_ALPHABET.length)
  })
})

describe('events', () => {
  it('이벤트 이름 8개', () => {
    expect(EVENT_NAMES).toEqual([
      'app_open',
      'memory_created',
      'memory_viewed',
      'invite_created',
      'couple_paired',
      'kakao_import_completed',
      'notification_sent',
      'widget_added',
    ])
  })
})
