import { router, useSegments } from 'expo-router'
import { useEffect } from 'react'
import { registerPushToken } from '@/modules/notifications/util-push-registration'
import { useMyPets } from '@/modules/pets/data-access-pets/usePets'
import { useMe } from '@/modules/user/data-access-me/useMe'
import { session, useSessionStatus } from '@/shared/auth/session'
import { type PetStatus, resolveAuthRedirect } from '../util-auth-gate/resolve-auth-redirect'
import { resolveConsentStatus } from '../util-auth-gate/resolve-consent-status'

// 조회 실패는 'some'으로 본다 — 펫 목록 API 장애로 앱 전체가 멈추지 않게
const toPetStatus = (pets: ReturnType<typeof useMyPets>): PetStatus => {
  if (pets.isError) return 'some'
  if (!pets.data) return 'unknown'
  return pets.data.length === 0 ? 'none' : 'some'
}

// 인증 게이트 (plan 1.13): 세션·동의·펫 상태를 모아 resolveAuthRedirect 규칙대로 화면을 바꾼다
// isNavigatorMounted: Stack이 렌더된 뒤에만 이동해야 expo-router가 경고 없이 동작한다
export const useAuthGate = ({ isNavigatorMounted }: { isNavigatorMounted: boolean }) => {
  const sessionStatus = useSessionStatus()
  const segments = useSegments()
  const me = useMe()

  useEffect(() => {
    session.bootstrap().catch(() => undefined)
  }, [])

  const consentStatus = sessionStatus === 'signedIn' ? resolveConsentStatus(me.data) : 'unknown'
  const isReadyForContent = sessionStatus === 'signedIn' && consentStatus === 'done'
  const pets = useMyPets({ isEnabled: isReadyForContent })
  const petStatus = isReadyForContent ? toPetStatus(pets) : 'unknown'
  const redirect = resolveAuthRedirect({ sessionStatus, consentStatus, petStatus, currentSegment: segments[0] })

  useEffect(() => {
    if (isNavigatorMounted && redirect) router.replace(redirect)
  }, [isNavigatorMounted, redirect])

  // PHASE 2 (plan 2.15): 앱 시작 시 이미 허용된 알림 권한이면 토큰을 다시 등록한다(권한 요청은 03 완료 때만)
  useEffect(() => {
    if (isReadyForContent) registerPushToken({ shouldRequestPermission: false }).catch(() => undefined)
  }, [isReadyForContent])

  return { isSessionResolved: sessionStatus !== 'loading' }
}
