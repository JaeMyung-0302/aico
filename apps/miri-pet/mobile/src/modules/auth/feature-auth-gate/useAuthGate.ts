import { useEffect, useState } from 'react'
import { registerPushToken } from '@/modules/notifications/util-push-registration'
import { useMyPets } from '@/modules/pets/data-access-pets/usePets'
import { useMe } from '@/modules/user/data-access-me/useMe'
import { session, useSessionStatus } from '@/shared/auth/session'
import { type AccessLevel, resolveAccessLevel } from '../util-auth-gate/resolve-access-level'
import type { ConsentStatus, PetStatus } from '../util-auth-gate/resolve-auth-redirect'
import { resolveConsentStatus } from '../util-auth-gate/resolve-consent-status'

// 조회 실패는 'some'으로 본다 — 펫 목록 API 장애로 앱 전체가 멈추지 않게
const toPetStatus = (pets: ReturnType<typeof useMyPets>): PetStatus => {
  if (pets.isError) return 'some'
  if (!pets.data) return 'unknown'
  return pets.data.length === 0 ? 'none' : 'some'
}

// /me 조회 실패(캐시 없음)도 앱을 막지 않는다 — 스플래시에 갇히지 않게.
// 동의는 서버 ConsentGuard(403 → markConsentRequired → /me 재조회)가 다시 확인한다
const toConsentStatus = (me: ReturnType<typeof useMe>): ConsentStatus =>
  me.isError && !me.data ? 'done' : resolveConsentStatus(me.data)

// 인증 게이트 (plan 1.13): 세션·동의·펫 상태로 접근 단계를 정한다.
// 화면 이동은 루트 _layout의 Stack.Protected가 맡는다(단계가 바뀌면 허용되지 않은 화면은 스택에서 빠진다)
// accessLevel: 처음 판단되기 전에는 null(스플래시 유지). 그 뒤 조회 중(null)에는 직전 단계를 유지한다
export const useAuthGate = () => {
  const sessionStatus = useSessionStatus()
  const me = useMe()
  const [lastLevel, setLastLevel] = useState<AccessLevel | null>(null)

  useEffect(() => {
    session.bootstrap().catch(() => undefined)
  }, [])

  const consentStatus = sessionStatus === 'signedIn' ? toConsentStatus(me) : 'unknown'
  const isReadyForContent = sessionStatus === 'signedIn' && consentStatus === 'done'
  const pets = useMyPets({ isEnabled: isReadyForContent })
  const petStatus = isReadyForContent ? toPetStatus(pets) : 'unknown'
  const currentLevel = resolveAccessLevel({ sessionStatus, consentStatus, petStatus })
  if (currentLevel !== null && currentLevel !== lastLevel) setLastLevel(currentLevel)

  // PHASE 2 (plan 2.15): 앱 시작 시 이미 허용된 알림 권한이면 토큰을 다시 등록한다(권한 요청은 03 완료 때만)
  useEffect(() => {
    if (isReadyForContent) registerPushToken({ shouldRequestPermission: false }).catch(() => undefined)
  }, [isReadyForContent])

  return { accessLevel: currentLevel ?? lastLevel }
}
