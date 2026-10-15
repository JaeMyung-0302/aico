import * as Notifications from 'expo-notifications'
import { type Href, router, usePathname, useSegments } from 'expo-router'
import { useEffect, useRef } from 'react'
import type { PetStatus } from '@/modules/auth/util-auth-gate/resolve-auth-redirect'
import { resolveConsentStatus } from '@/modules/auth/util-auth-gate/resolve-consent-status'
import { useMyPets } from '@/modules/pets/data-access-pets/usePets'
import { useMe } from '@/modules/user/data-access-me/useMe'
import { useSessionStatus } from '@/shared/auth/session'
import { isAuthGateOpen, resolvePushRoute, shouldShowInForeground } from '../util-push-route/resolve-push-route'

const behaviorOf = (isShown: boolean): Notifications.NotificationBehavior => ({
  shouldShowBanner: isShown,
  shouldShowList: isShown,
  shouldPlaySound: isShown,
  shouldSetBadge: false,
})

// 푸시 탭(웜 스타트 리스너 + 콜드 스타트 마지막 응답) → 화면 이동. isReady가 false면 마지막 화면 하나를 대기열에 둔다.
// 포그라운드 수신: 지금 보고 있는 대화방의 DM만 배너를 숨긴다
export const usePushRouting = ({ isReady, pathname }: { isReady: boolean; pathname: string }) => {
  const isReadyRef = useRef(isReady)
  const pathnameRef = useRef(pathname)
  const pendingRef = useRef<Href | null>(null)
  const handledIdRef = useRef<string | null>(null)

  useEffect(() => {
    pathnameRef.current = pathname
  }, [pathname])

  useEffect(() => {
    isReadyRef.current = isReady
    const pending = pendingRef.current
    if (!isReady || !pending) return
    pendingRef.current = null
    router.push(pending)
  }, [isReady])

  useEffect(() => {
    let isActive = true
    // 콜드 스타트 응답이 리스너로도 올 수 있어 같은 identifier는 한 번만 처리한다
    const handleResponse = (response: Notifications.NotificationResponse) => {
      const { identifier, content } = response.notification.request
      if (!isActive || handledIdRef.current === identifier) return
      handledIdRef.current = identifier
      const href = resolvePushRoute(content.data)
      if (!href) return
      if (isReadyRef.current) router.push(href)
      else pendingRef.current = href
    }

    const subscription = Notifications.addNotificationResponseReceivedListener(handleResponse)
    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (!response) return
        handleResponse(response)
        // 다시 마운트돼도 같은 알림으로 또 이동하지 않게 지운다
        return Notifications.clearLastNotificationResponseAsync()
      })
      .catch(() => undefined)
    Notifications.setNotificationHandler({
      handleNotification: async (notification) =>
        behaviorOf(shouldShowInForeground(notification.request.content.data, pathnameRef.current)),
    })

    return () => {
      isActive = false
      subscription.remove()
      Notifications.setNotificationHandler(null)
    }
  }, [])
}

// 조회 실패는 'some' — useAuthGate와 같은 규칙(펫 목록 장애로 앱을 막지 않는다)
const toPetStatus = (pets: ReturnType<typeof useMyPets>): PetStatus => {
  if (pets.isError) return 'some'
  if (!pets.data) return 'unknown'
  return pets.data.length === 0 ? 'none' : 'some'
}

// 루트 레이아웃에서 한 번 호출: 인증 게이트가 탭까지 통과시킨 뒤(로그인 + 동의 + 펫)에만 푸시 화면으로 이동한다
export const usePushNavigation = ({ isNavigatorMounted }: { isNavigatorMounted: boolean }) => {
  const sessionStatus = useSessionStatus()
  const segments = useSegments()
  const pathname = usePathname()
  const me = useMe()
  const consentStatus = sessionStatus === 'signedIn' ? resolveConsentStatus(me.data) : 'unknown'
  const isConsented = sessionStatus === 'signedIn' && consentStatus === 'done'
  const pets = useMyPets({ isEnabled: isConsented })
  const isGateOpen = isAuthGateOpen({
    sessionStatus,
    consentStatus,
    petStatus: isConsented ? toPetStatus(pets) : 'unknown',
    currentSegment: segments[0],
  })
  usePushRouting({ isReady: isNavigatorMounted && isGateOpen, pathname })
}
