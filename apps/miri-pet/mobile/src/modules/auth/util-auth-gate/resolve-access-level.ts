import type { AuthGateInput } from './resolve-auth-redirect'

// 루트 Stack.Protected 그룹 단위: 로그인 전 / 동의 전 / 펫 0마리 / 앱 전체
export type AccessLevel = 'signedOut' | 'consentRequired' | 'petless' | 'allowed'

export type AccessInput = Omit<AuthGateInput, 'currentSegment'>

// 인증 게이트 규칙 (plan 1.13)과 같은 순서. null = 아직 판단할 수 없음(세션·/me·펫 목록 조회 중)
export const resolveAccessLevel = ({ sessionStatus, consentStatus, petStatus }: AccessInput): AccessLevel | null => {
  if (sessionStatus === 'loading') return null
  if (sessionStatus === 'signedOut') return 'signedOut'
  if (consentStatus === 'unknown') return null
  if (consentStatus === 'required') return 'consentRequired'
  if (petStatus === 'unknown') return null
  return petStatus === 'none' ? 'petless' : 'allowed'
}
