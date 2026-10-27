import { type AnniversaryItem, WidgetSnapshotV1 } from '@you-in-heart/shared'
import { ACTIVE_COUPLE, ANNIVERSARY_ITEMS, FIXED_NOW_MS, ME, toSummary } from '@/test-utils/fixtures'
import { buildWidgetSnapshot } from '../util-widget/build-widget-snapshot'

// 위젯 저장소(App Group·AsyncStorage)는 잠금 없이 읽힌다 → 토큰·사진·본문·좌표가 실리면 안 된다
const FORBIDDEN_KEYS = [
  'accessToken',
  'refreshToken',
  'token',
  'photo',
  'photoUrl',
  'photoKey',
  'body',
  'text',
  'lat',
  'lng',
  'coordinates',
]

const collectKeys = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.flatMap(collectKeys)
  if (value === null || typeof value !== 'object') return []
  return Object.entries(value).flatMap(([key, child]) => [key, ...collectKeys(child)])
}

const build = (overrides: Partial<Parameters<typeof buildWidgetSnapshot>[0]> = {}) =>
  buildWidgetSnapshot({
    me: ME,
    couple: ACTIVE_COUPLE,
    anniversaries: ANNIVERSARY_ITEMS,
    nowMs: FIXED_NOW_MS,
    ...overrides,
  })

describe('buildWidgetSnapshot', () => {
  it('사귄 날·두 이름·다음 기념일만 담고 WidgetSnapshotV1(strict)를 통과한다', () => {
    const snapshot = build()
    expect(snapshot).toEqual({
      v: 1,
      startedOn: '2025-09-10',
      names: ['재명', '지은'],
      next: { title: '500일', date: '2027-01-22' },
    })
    expect(WidgetSnapshotV1.safeParse(snapshot).success).toBe(true)
  })

  it.each(FORBIDDEN_KEYS)('스냅샷에 %s 키가 하나라도 있으면 계약 검사에서 실패한다', (key) => {
    const snapshot = build()
    expect(snapshot).not.toBeNull()
    expect(WidgetSnapshotV1.safeParse({ ...snapshot, [key]: 'x' }).success).toBe(false)
    expect(WidgetSnapshotV1.safeParse({ ...snapshot, next: { ...snapshot?.next, [key]: 'x' } }).success).toBe(false)
  })

  it('입력에 다른 필드가 섞여 있어도 결과에는 금지 키가 없다', () => {
    const me = { ...ME, accessToken: 'secret', photoUrl: 'https://x' }
    const anniversaries = ANNIVERSARY_ITEMS.map((item) => ({ ...item, body: '본문', lat: 37.5, lng: 127 }))
    const keys = collectKeys(build({ me, anniversaries }))
    expect(keys.filter((key) => FORBIDDEN_KEYS.includes(key))).toEqual([])
  })

  it('다음 기념일은 오늘(KST) 이후 가장 가까운 것 1개 — 지난 날은 빼고, 오늘은 포함한다', () => {
    const items: AnniversaryItem[] = [
      { id: 'auto:100d:400', refKey: 'auto:100d:400', kind: 'HUNDRED_DAYS', title: '400일', date: '2026-10-14' },
      { id: 'c2', refKey: 'custom:c2', kind: 'CUSTOM', title: '생일', date: '2026-12-01' },
      { id: 'c1', refKey: 'custom:c1', kind: 'CUSTOM', title: '오늘 기념일', date: '2026-10-27' },
    ]
    expect(build({ anniversaries: items })?.next).toEqual({ title: '오늘 기념일', date: '2026-10-27' })
    expect(build({ anniversaries: items.slice(0, 2) })?.next).toEqual({ title: '생일', date: '2026-12-01' })
    expect(build({ anniversaries: items.slice(0, 1) })?.next).toBeNull()
  })

  it('기념일 목록을 아직 못 받았으면 사귄 날로 다음 100일·주년을 계산한다', () => {
    expect(build({ anniversaries: undefined })?.next).toEqual({ title: '500일', date: '2027-01-22' })
  })

  it('상대 이름이 없으면 "상대"로 채운다', () => {
    expect(build({ couple: undefined })?.names).toEqual(['재명', '상대'])
  })

  it('미로그인·미연결·사귄 날 없음·연결 해제 유예 중이면 스냅샷이 없다(null → 위젯 비움)', () => {
    expect(build({ me: undefined })).toBeNull()
    expect(build({ me: { ...ME, couple: null } })).toBeNull()
    expect(build({ me: { ...ME, couple: { ...toSummary(ACTIVE_COUPLE), startedOn: null } } })).toBeNull()
    const unlinking = { ...toSummary(ACTIVE_COUPLE), status: 'UNLINKING' as const }
    expect(build({ me: { ...ME, couple: unlinking } })).toBeNull()
  })
})
