import { QueryClientProvider } from '@tanstack/react-query'
import { useFonts } from 'expo-font'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { FONT_FAMILY } from '@/design-system/tokens/typography'
import { useAuthGate } from '@/modules/auth/feature-auth-gate/useAuthGate'
import { usePushNavigation } from '@/modules/notifications/feature-push-navigation/usePushNavigation'
import { useMe } from '@/modules/user/data-access-me/useMe'
import { useAnalyticsIdentity } from '@/shared/analytics/use-analytics-identity'
import { analytics } from '@/shared/observability/boot'
import { queryClient } from '@/shared/query-client'

SplashScreen.preventAutoHideAsync().catch(() => undefined)

// 인증 게이트: 접근 단계(resolve-access-level.ts)별로 Stack.Protected 그룹 하나만 연다.
// 단계가 바뀌면 허용되지 않은 화면은 스택에서 통째로 빠지고(이전 계정 화면 잔상·뒤로 되돌이 없음),
// 남은 화면이 없으면 열린 그룹의 첫 화면으로 간다 → 그룹 순서가 곧 착지 화면이다
const RootNavigator = () => {
  const [areFontsLoaded, fontError] = useFonts({
    [FONT_FAMILY.regular]: require('pretendard/dist/public/static/Pretendard-Regular.otf'),
    [FONT_FAMILY.medium]: require('pretendard/dist/public/static/Pretendard-Medium.otf'),
    [FONT_FAMILY.semibold]: require('pretendard/dist/public/static/Pretendard-SemiBold.otf'),
    [FONT_FAMILY.bold]: require('pretendard/dist/public/static/Pretendard-Bold.otf'),
  })
  // 폰트 로드에 실패해도 시스템 폰트로 앱은 떠야 한다
  const areFontsReady = areFontsLoaded || fontError !== null
  const { accessLevel } = useAuthGate()
  // 푸시 탭 → 해당 화면 (게이트가 탭까지 통과시킨 뒤에만 이동, 그 전에는 대기)
  usePushNavigation({ isNavigatorMounted: areFontsReady && accessLevel !== null })
  // Sentry·PostHog는 boot import 시점에 초기화(키 없으면 no-op). PostHog distinctId = userId만
  useAnalyticsIdentity(analytics, useMe().data?.id ?? null)
  // 게이트가 첫 단계를 정하기 전에는 아무 화면도 그리지 않고 스플래시를 유지한다 (홈 깜빡임·불필요한 조회 방지)
  const isReady = areFontsReady && accessLevel !== null

  useEffect(() => {
    if (isReady) SplashScreen.hideAsync().catch(() => undefined)
  }, [isReady])

  if (!isReady) return null

  const isAllowed = accessLevel === 'allowed'
  const isConsented = isAllowed || accessLevel === 'petless'

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={accessLevel === 'signedOut'}>
          <Stack.Screen name="login" options={{ gestureEnabled: false, animation: 'fade' }} />
        </Stack.Protected>
        <Stack.Protected guard={accessLevel === 'consentRequired'}>
          <Stack.Screen name="consent" options={{ gestureEnabled: false }} />
        </Stack.Protected>
        <Stack.Protected guard={isAllowed}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="notifications" />
          <Stack.Screen name="spike" />
          <Stack.Screen name="dm/[conversationId]" />
          <Stack.Screen name="pets/new" />
          <Stack.Screen name="pets/[petId]/edit" />
          <Stack.Screen name="pets/[petId]/entry-card" />
          <Stack.Screen name="pets/[petId]/vaccinations/new" />
          <Stack.Screen name="pets/[petId]/vaccinations/[vaccinationId]/edit" />
          <Stack.Screen name="places/[placeId]" />
          <Stack.Screen name="places/report" />
          <Stack.Screen name="posts/[postId]" />
          <Stack.Screen name="posts/new" />
          <Stack.Screen name="users/[userId]" />
        </Stack.Protected>
        {/* 펫 0마리여도 머무를 수 있는 화면. 펫 저장 직후 탭이 열릴 때까지 펫 만들기 화면이 남아 있어야 한다 */}
        <Stack.Protected guard={isConsented}>
          <Stack.Screen name="onboarding/pet" options={{ gestureEnabled: false }} />
          <Stack.Screen name="settings" />
          <Stack.Screen name="settings/consents" />
        </Stack.Protected>
      </Stack>
    </>
  )
}

const RootLayout = () => (
  <SafeAreaProvider>
    <QueryClientProvider client={queryClient}>
      <RootNavigator />
    </QueryClientProvider>
  </SafeAreaProvider>
)

export default RootLayout
