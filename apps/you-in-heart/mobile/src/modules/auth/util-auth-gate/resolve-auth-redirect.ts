import type { CoupleStatus } from '@you-in-heart/shared'
import type { SessionStatus } from '@/shared/auth/session-store'

// 게이트가 보는 /me 의 일부 (GET /me — displayName 미입력 null, 미연결 couple null)
export type GateMe = {
  displayName: string | null
  couple: { status: CoupleStatus } | null
  consents?: { terms: boolean; privacy: boolean }
}

// 서버는 필수 동의가 없으면 커플 라우트를 403 CONSENT_REQUIRED로 막는다 → 프로필 화면이 동의를 다시 보낸다
const hasRequiredConsents = (me: GateMe): boolean => !me.consents || (me.consents.terms && me.consents.privacy)

export type AuthGateInput = {
  sessionStatus: SessionStatus
  me: GateMe | undefined
  // /me 조회 실패 (캐시가 없으면 오프라인 콜드 스타트)
  isMeError: boolean
}

export type AuthDestination = '/login' | '/onboarding/profile' | '/pairing' | '/(tabs)'

// 인증 게이트 규칙 (plan 0F.5): signedOut → 로그인, 이름 없음 → 프로필, 미연결 → 페어링, UNLINKING·ACTIVE → 탭
// null = 아직 판단할 수 없음(세션·/me 조회 중 → 스플래시 유지)
export const resolveAuthRedirect = ({ sessionStatus, me, isMeError }: AuthGateInput): AuthDestination | null => {
  if (sessionStatus === 'loading') return null
  if (sessionStatus === 'signedOut') return '/login'
  // /me 실패 + 캐시 없음: 앱을 막지 않는다 (탭 화면이 오류·다시 시도를 보여준다)
  if (!me) return isMeError ? '/(tabs)' : null
  if (!me.displayName || !hasRequiredConsents(me)) return '/onboarding/profile'
  if (!me.couple) return '/pairing'
  return '/(tabs)'
}

// UNLINKING 이면 탭은 열되 홈에 유예 배너를 띄운다
export const isUnlinkingBannerVisible = (me: GateMe | undefined): boolean => me?.couple?.status === 'UNLINKING'
