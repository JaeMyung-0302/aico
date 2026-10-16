import { REQUIRED_CONSENT_KINDS, submitConsentsRequestSchema } from '@miri-pet/shared'
import { buildConsentRequest, CONSENT_VERSION, isConsentItemRequired } from '../util-consent/build-consent-request'

const ALL_REQUIRED = {
  isAge14OrOlder: true,
  terms: true,
  privacy: true,
  community: true,
  location: false,
  marketing: false,
}

describe('buildConsentRequest', () => {
  it('필수 동의(shared REQUIRED_CONSENT_KINDS)를 기록하고 shared 스키마를 통과한다', () => {
    const request = buildConsentRequest(ALL_REQUIRED)
    expect(request).toEqual({
      isAge14OrOlder: true,
      consents: [
        { kind: 'TERMS', version: CONSENT_VERSION },
        { kind: 'PRIVACY', version: CONSENT_VERSION },
      ],
    })
    expect(request?.consents.map((consent) => consent.kind)).toEqual(
      expect.arrayContaining([...REQUIRED_CONSENT_KINDS]),
    )
    expect(submitConsentsRequestSchema.safeParse(request).success).toBe(true)
  })

  it('선택 동의(위치·마케팅)를 체크하면 LOCATION·MARKETING을 함께 기록한다', () => {
    const request = buildConsentRequest({ ...ALL_REQUIRED, location: true, marketing: true })
    expect(request?.consents.map((consent) => consent.kind)).toEqual(['TERMS', 'PRIVACY', 'LOCATION', 'MARKETING'])
  })

  it('필수 동의가 하나라도 빠지면 null (커뮤니티 수칙은 UI 필수)', () => {
    expect(buildConsentRequest({ ...ALL_REQUIRED, isAge14OrOlder: false })).toBeNull()
    expect(buildConsentRequest({ ...ALL_REQUIRED, community: false })).toBeNull()
    expect(buildConsentRequest({ ...ALL_REQUIRED, privacy: false })).toBeNull()
  })
})

describe('isConsentItemRequired', () => {
  it('14세·커뮤니티 수칙은 항상 필수, 약관·개인정보는 shared 필수 목록, 위치·마케팅은 선택', () => {
    expect(isConsentItemRequired('isAge14OrOlder')).toBe(true)
    expect(isConsentItemRequired('community')).toBe(true)
    expect(isConsentItemRequired('terms')).toBe(true)
    expect(isConsentItemRequired('privacy')).toBe(true)
    expect(isConsentItemRequired('location')).toBe(false)
    expect(isConsentItemRequired('marketing')).toBe(false)
  })
})
