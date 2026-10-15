import { resolveConsentStatus } from '../resolve-consent-status'

describe('resolveConsentStatus', () => {
  it('내 정보를 아직 못 받았으면 unknown', () => {
    expect(resolveConsentStatus(undefined)).toBe('unknown')
  })

  it('서버 /me의 hasRequiredConsents를 따른다', () => {
    expect(resolveConsentStatus({ hasRequiredConsents: true })).toBe('done')
    expect(resolveConsentStatus({ hasRequiredConsents: false })).toBe('required')
  })
})
