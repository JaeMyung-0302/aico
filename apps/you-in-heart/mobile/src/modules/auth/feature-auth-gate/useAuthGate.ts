import { useEffect, useState } from 'react'
import { useMe } from '@/modules/user/data-access-me/useMe'
import { session, useSessionStatus } from '@/shared/auth/session'
import {
  type AuthDestination,
  isUnlinkingBannerVisible,
  resolveAuthRedirect,
} from '../util-auth-gate/resolve-auth-redirect'

// 인증 게이트: 세션·/me 로 갈 곳(destination)을 정한다. 화면 이동은 루트 _layout의 Stack.Protected가 맡는다
// destination: 처음 판단되기 전에는 null(스플래시 유지). 그 뒤 조회 중(null)에는 직전 값을 유지한다
export const useAuthGate = () => {
  const sessionStatus = useSessionStatus()
  const me = useMe()
  const [lastDestination, setLastDestination] = useState<AuthDestination | null>(null)

  useEffect(() => {
    session.bootstrap().catch(() => undefined)
  }, [])

  const isSignedIn = sessionStatus === 'signedIn'
  const current = resolveAuthRedirect({
    sessionStatus,
    me: isSignedIn ? me.data : undefined,
    isMeError: isSignedIn && me.isError,
  })
  if (current !== null && current !== lastDestination) setLastDestination(current)

  return { destination: current ?? lastDestination, isUnlinking: isUnlinkingBannerVisible(me.data) }
}
