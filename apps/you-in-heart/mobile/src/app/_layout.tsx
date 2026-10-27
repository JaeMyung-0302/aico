import '@/shared/observability/boot'
import { QueryClientProvider } from '@tanstack/react-query'
import { useFonts } from 'expo-font'
import { Stack, useRootNavigationState } from 'expo-router'
import { ShareIntentProvider } from 'expo-share-intent'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { FONT_FAMILY } from '@/design-system/tokens/typography'
import { useAuthGate } from '@/modules/auth/feature-auth-gate/useAuthGate'
import { useShareRouting } from '@/modules/quote/feature-share-receive/useShareRouting'
import { useUploadRunner } from '@/modules/media/data-access-media/useUploadPhotos'
import { useMe } from '@/modules/user/data-access-me/useMe'
import { useWidgetSync } from '@/modules/widget/feature-widget-sync/useWidgetSync'
import { useSessionStatus } from '@/shared/auth/session'
import { usePushTokenRegistration } from '@/shared/notifications/register-push-token'
import { useNotificationRouting } from '@/shared/notifications/route-notification'
import { queryClient } from '@/shared/query-client'

SplashScreen.preventAutoHideAsync().catch(() => undefined)

// 화면과 무관한 기기 동기화: 홈 위젯 스냅샷(1B), 로그인 후 푸시 토큰 등록(1A.8), 사진 업로드 큐(1E), 알림 탭 이동(1G)
const DeviceSync = () => {
  useWidgetSync()
  useUploadRunner()
  useNotificationRouting()
  const isSignedIn = useSessionStatus() === 'signedIn'
  const me = useMe()
  usePushTokenRegistration(isSignedIn ? (me.data?.id ?? null) : null)
  return null
}

// 인증 게이트: 갈 곳(resolve-auth-redirect.ts)별로 Stack.Protected 그룹만 연다.
// 단계가 바뀌면 허용되지 않은 화면은 스택에서 통째로 빠지고(계정 전환 잔상·뒤로 되돌이 없음),
// 남은 화면이 없으면 열린 화면 중 첫 화면으로 간다 → 선언 순서가 곧 착지 화면이다
const RootNavigator = () => {
  const [areFontsLoaded, fontError] = useFonts({
    [FONT_FAMILY.regular]: require('pretendard/dist/public/static/Pretendard-Regular.otf'),
    [FONT_FAMILY.medium]: require('pretendard/dist/public/static/Pretendard-Medium.otf'),
    [FONT_FAMILY.bold]: require('pretendard/dist/public/static/Pretendard-Bold.otf'),
    [FONT_FAMILY.serifMedium]: require('@expo-google-fonts/noto-serif-kr/500Medium/NotoSerifKR_500Medium.ttf'),
    [FONT_FAMILY.serifBold]: require('@expo-google-fonts/noto-serif-kr/700Bold/NotoSerifKR_700Bold.ttf'),
  })
  // 폰트 로드에 실패해도 시스템 폰트로 앱은 떠야 한다
  const areFontsReady = areFontsLoaded || fontError !== null
  const { destination } = useAuthGate()
  // 게이트가 첫 단계를 정하기 전에는 아무 화면도 그리지 않고 스플래시를 유지한다
  const isReady = areFontsReady && destination !== null
  // 받은 공유(4D)는 스택이 붙은 뒤에만 연다 — 로그인 전이면 기억해 두고 탭·페어링에 도착하면 이어서 연다
  const isNavigationReady = Boolean(useRootNavigationState()?.key)
  useShareRouting(isReady && isNavigationReady ? destination : null)

  useEffect(() => {
    if (isReady) SplashScreen.hideAsync().catch(() => undefined)
  }, [isReady])

  if (!isReady) return null

  const isPairing = destination === '/pairing'

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={destination === '/login'}>
          <Stack.Screen name="login" options={{ gestureEnabled: false, animation: 'fade' }} />
        </Stack.Protected>
        <Stack.Protected guard={isPairing}>
          <Stack.Screen name="pairing/index" options={{ gestureEnabled: false }} />
          <Stack.Screen name="pairing/join" />
        </Stack.Protected>
        {/* 이름 저장 직후 페어링이 열릴 때까지 프로필 화면이 남아 있어야 한다(고른 화면으로 이어서 이동) */}
        <Stack.Protected guard={destination === '/onboarding/profile' || isPairing}>
          <Stack.Screen name="onboarding/profile" options={{ gestureEnabled: false }} />
        </Stack.Protected>
        <Stack.Protected guard={destination === '/(tabs)'}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="settings/index" />
          <Stack.Screen name="anniversaries/index" />
          <Stack.Screen name="pairing/started-on" />
          <Stack.Screen name="diary/new" options={{ presentation: 'fullScreenModal' }} />
          <Stack.Screen name="diary/[entryId]" />
          <Stack.Screen name="photos/[photoId]" options={{ animation: 'fade' }} />
          <Stack.Screen name="album/import" options={{ presentation: 'fullScreenModal' }} />
          <Stack.Screen name="places/[placeId]" />
          <Stack.Screen name="bucket/index" />
          <Stack.Screen name="quotes/index" />
          <Stack.Screen name="quotes/import" />
        </Stack.Protected>
        {/* 공유로 받기(SCR-14): 미연결이면 "먼저 상대와 연결해 주세요"를 보여야 해서 페어링 단계에도 연다. 착지 화면이 되지 않게 마지막에 둔다 */}
        <Stack.Protected guard={destination === '/(tabs)' || isPairing}>
          <Stack.Screen name="quotes/share" />
        </Stack.Protected>
      </Stack>
    </>
  )
}

const RootLayout = () => (
  <SafeAreaProvider>
    <QueryClientProvider client={queryClient}>
      <ShareIntentProvider>
        <DeviceSync />
        <RootNavigator />
      </ShareIntentProvider>
    </QueryClientProvider>
  </SafeAreaProvider>
)

export default RootLayout
