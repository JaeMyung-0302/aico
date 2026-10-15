import type { MyConsent } from '@miri-pet/shared'
import { buildConsentRows, formatConsentDate, isConsentAgreed } from '../util-consents/consent-rows'

// 정오(UTC)로 잡아 기기 시간대와 무관하게 같은 날짜가 나오게 한다
const AGREED_AT = '2026-10-01T03:00:00.000Z'
const WITHDRAWN_AT = '2026-10-05T03:00:00.000Z'

const consent = (kind: MyConsent['kind'], withdrawnAt: string | null = null): MyConsent => ({
  kind,
  version: '2026-10-01',
  agreedAt: AGREED_AT,
  withdrawnAt,
})

describe('formatConsentDate', () => {
  it('YYYY.MM.DD', () => {
    expect(formatConsentDate(AGREED_AT)).toBe('2026.10.01')
  })
})

describe('isConsentAgreed', () => {
  it('철회되지 않은 행이 있을 때만 true', () => {
    expect(isConsentAgreed([consent('LOCATION')], 'LOCATION')).toBe(true)
    expect(isConsentAgreed([consent('LOCATION', WITHDRAWN_AT)], 'LOCATION')).toBe(false)
    expect(isConsentAgreed([consent('TERMS')], 'LOCATION')).toBe(false)
    expect(isConsentAgreed(undefined, 'LOCATION')).toBe(false)
  })
})

describe('buildConsentRows', () => {
  it('5종을 필수 → 선택 → 증명서 순서로, 상태와 날짜를 붙여 만든다', () => {
    const rows = buildConsentRows([
      consent('CERTIFICATE'),
      consent('MARKETING', WITHDRAWN_AT),
      consent('TERMS'),
      consent('PRIVACY'),
    ])
    expect(rows).toEqual([
      { kind: 'TERMS', label: '서비스 이용약관', group: 'required', isAgreed: true, status: '2026.10.01 동의' },
      { kind: 'PRIVACY', label: '개인정보 수집 · 이용', group: 'required', isAgreed: true, status: '2026.10.01 동의' },
      { kind: 'LOCATION', label: '위치기반서비스 이용', group: 'optional', isAgreed: false, status: '동의하지 않음' },
      { kind: 'MARKETING', label: '마케팅 정보 수신', group: 'optional', isAgreed: false, status: '2026.10.05 철회' },
      { kind: 'CERTIFICATE', label: '증명서 사진 보관', group: 'certificate', isAgreed: true, status: '2026.10.01 동의' },
    ])
  })

  it('기록이 없으면 모두 동의하지 않음', () => {
    expect(buildConsentRows([]).every((row) => !row.isAgreed && row.status === '동의하지 않음')).toBe(true)
  })
})
