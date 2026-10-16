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

// 인증 게이트: 토큰 없음 → /login, 동의 없음 → /consent, 그 외 → 탭 (규칙: resolve-auth-redirect.ts)
const RootNavigator = () => {
  const [areFontsLoaded, fontError] = useFonts({
    [FONT_FAMILY.regular]: require('pretendard/dist/public/static/Pretendard-Regular.otf'),
    [FONT_FAMILY.medium]: require('pretendard/dist/public/static/Pretendard-Medium.otf'),
    [FONT_FAMILY.semibold]: require('pretendard/dist/public/static/Pretendard-SemiBold.otf'),
    [FONT_FAMILY.bold]: require('pretendard/dist/public/static/Pretendard-Bold.otf'),
  })
  // 폰트 로드에 실패해도 시스템 폰트로 앱은 떠야 한다
  const areFontsReady = areFontsLoaded || fontError !== null
  const { isSessionResolved } = useAuthGate({ isNavigatorMounted: areFontsReady })
  // 푸시 탭 → 해당 화면 (게이트가 탭까지 통과시킨 뒤에만 이동, 그 전에는 대기)
  usePushNavigation({ isNavigatorMounted: areFontsReady })
  // Sentry·PostHog는 boot import 시점에 초기화(키 없으면 no-op). PostHog distinctId = userId만
  useAnalyticsIdentity(analytics, useMe().data?.id ?? null)
  const isReady = areFontsReady && isSessionResolved

  useEffect(() => {
    if (isReady) SplashScreen.hideAsync().catch(() => undefined)
  }, [isReady])

  if (!areFontsReady) return null

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="login" options={{ gestureEnabled: false, animation: 'fade' }} />
        <Stack.Screen name="consent" options={{ gestureEnabled: false }} />
        <Stack.Screen name="settings" />
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
