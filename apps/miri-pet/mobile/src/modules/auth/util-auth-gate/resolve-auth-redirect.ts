import type { SessionStatus } from '@/shared/auth/session-store'

export type ConsentStatus = 'unknown' | 'required' | 'done'
// 내 펫 수: 조회 중 'unknown', 0마리 'none', 1마리 이상(또는 조회 실패 — 앱을 막지 않는다) 'some'
export type PetStatus = 'unknown' | 'none' | 'some'

export type AuthGateInput = {
  sessionStatus: SessionStatus
  consentStatus: ConsentStatus
  petStatus: PetStatus
  // useSegments()[0] — 예: '(tabs)', 'login', 'consent', 'settings'
  currentSegment: string | undefined
}

export type AuthRedirect = '/login' | '/consent' | '/onboarding/pet' | '/'

// 펫이 없어도 머무를 수 있는 화면: 03 펫 만들기 자체, 19 설정(로그아웃·탈퇴)
const PETLESS_SEGMENTS: ReadonlySet<string> = new Set(['onboarding', 'settings'])

// 인증 게이트 규칙 (plan 1.13): 토큰 없음 → 01 로그인, 동의 없음 → 02 동의, 펫 0마리 → 03 펫 만들기, 그 외 → 탭
// null = 지금 화면 유지
export const resolveAuthRedirect = ({
  sessionStatus,
  consentStatus,
  petStatus,
  currentSegment,
}: AuthGateInput): AuthRedirect | null => {
  if (sessionStatus === 'loading') return null
  if (sessionStatus === 'signedOut') return currentSegment === 'login' ? null : '/login'
  if (consentStatus === 'unknown') return null
  if (consentStatus === 'required') return currentSegment === 'consent' ? null : '/consent'

  // PHASE 2 (plan 1.13): 펫이 0마리면 03 펫 만들기로
  if (petStatus === 'unknown') return null
  if (petStatus === 'none') {
    return currentSegment !== undefined && PETLESS_SEGMENTS.has(currentSegment) ? null : '/onboarding/pet'
  }

  return currentSegment === 'login' || currentSegment === 'consent' ? '/' : null
}
