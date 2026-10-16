import type { Me } from '@miri-pet/shared'
import type { ConsentStatus } from './resolve-auth-redirect'

// 서버 /me.hasRequiredConsents (shared REQUIRED_CONSENT_KINDS 기준)로 동의 단계를 판단한다
export const resolveConsentStatus = (me: Pick<Me, 'hasRequiredConsents'> | undefined): ConsentStatus => {
  if (!me) return 'unknown'
  return me.hasRequiredConsents ? 'done' : 'required'
}
