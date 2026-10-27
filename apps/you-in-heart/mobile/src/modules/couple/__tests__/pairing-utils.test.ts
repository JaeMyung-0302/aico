import { ApiError } from '@/shared/api/api-error'
import { formatInviteRemaining } from '../util-pairing/format-invite-remaining'
import { findPartnerName } from '../util-pairing/partner-name'
import { normalizeInviteCodeInput, toJoinErrorMessage } from '../util-pairing/pairing-messages'
import { formatDotDate, formatStartedOnInput, isValidStartedOn } from '../util-pairing/started-on-input'

const NOW = Date.parse('2026-10-27T03:00:00.000Z')
const MINUTE = 60_000

describe('formatInviteRemaining', () => {
  it.each([
    [(23 * 60 + 41) * MINUTE + 30_000, '23시간 41분 뒤 만료돼요'],
    [24 * 60 * MINUTE, '24시간 0분 뒤 만료돼요'],
    [59 * MINUTE, '59분 뒤 만료돼요'],
    [10_000, '1분 뒤 만료돼요'],
  ])('남은 %sms → %s', (remainingMs, expected) => {
    expect(formatInviteRemaining(new Date(NOW + remainingMs).toISOString(), NOW)).toBe(expected)
  })

  it.each([0, -MINUTE])('만료(남은 %sms)면 null', (remainingMs) => {
    expect(formatInviteRemaining(new Date(NOW + remainingMs).toISOString(), NOW)).toBeNull()
  })

  it('잘못된 시각이면 null', () => {
    expect(formatInviteRemaining('not-a-date', NOW)).toBeNull()
  })
})

describe('toJoinErrorMessage', () => {
  it.each([
    [404, '코드를 확인해 주세요'],
    [429, '여러 번 틀려서 잠시 입력할 수 없어요. 10분 뒤에 다시 시도해 주세요'],
    [500, '연결하지 못했어요. 잠시 후 다시 시도해 주세요'],
  ])('HTTP %s → %s', (status, message) => {
    expect(toJoinErrorMessage(new ApiError({ code: 'HTTP', status, message: 'x' }))).toBe(message)
  })

  it('네트워크·알 수 없는 오류', () => {
    expect(toJoinErrorMessage(new ApiError({ code: 'NETWORK', message: 'x' }))).toBe('인터넷 연결을 확인해 주세요')
    expect(toJoinErrorMessage(new Error('x'))).toBe('연결하지 못했어요. 잠시 후 다시 시도해 주세요')
  })
})

describe('normalizeInviteCodeInput', () => {
  it('대문자로 바꾸고 영문·숫자만 6자까지 남긴다', () => {
    expect(normalizeInviteCodeInput('k7m q2-xyz')).toBe('K7MQ2X')
    expect(normalizeInviteCodeInput('')).toBe('')
  })
})

describe('사귄 날 입력', () => {
  it('숫자만 받아 YYYY-MM-DD 로 맞춘다', () => {
    expect(formatStartedOnInput('20250910')).toBe('2025-09-10')
    expect(formatStartedOnInput('2025-0')).toBe('2025-0')
    expect(formatStartedOnInput('2025년 9월')).toBe('2025-9')
    expect(formatStartedOnInput('')).toBe('')
  })

  it('올바른 과거·오늘(KST) 날짜만 허용한다', () => {
    expect(isValidStartedOn('2025-09-10', NOW)).toBe(true)
    expect(isValidStartedOn('2026-10-27', NOW)).toBe(true)
    expect(isValidStartedOn('2026-10-28', NOW)).toBe(false)
    expect(isValidStartedOn('2025-13-01', NOW)).toBe(false)
    expect(isValidStartedOn('2025-09', NOW)).toBe(false)
  })

  it('설정 표기 2025. 09. 10', () => {
    expect(formatDotDate('2025-09-10')).toBe('2025. 09. 10')
  })
})

describe('findPartnerName', () => {
  const member = (userId: string, displayName: string | null, slot: 1 | 2) => ({
    userId,
    displayName,
    slot,
    reconnectConfirmedAt: null,
  })
  const couple = {
    id: 'c',
    status: 'ACTIVE' as const,
    startedOn: null,
    members: [member('me', '재명', 1), member('you', '지은', 2)],
    unlinkRequestedAt: null,
    unlinkRequestedBy: null,
    purgeAfter: null,
  }

  it('내가 아닌 구성원 이름, 없으면 "상대"', () => {
    expect(findPartnerName(couple, 'me')).toBe('지은')
    expect(findPartnerName({ ...couple, members: [member('me', '재명', 1), member('you', null, 2)] }, 'me')).toBe(
      '상대',
    )
    expect(findPartnerName(undefined, 'me')).toBe('상대')
  })
})
