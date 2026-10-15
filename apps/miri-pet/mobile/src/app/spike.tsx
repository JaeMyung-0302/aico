// ⚠️ Phase 0 네이티브 스파이크 전용 화면 — dev client 실기기 검증이 끝나면 삭제한다 (plan 0.4)
import { GoogleSignin } from '@react-native-google-signin/google-signin'
import { initializeKakaoSDK } from '@react-native-kakao/core'
import { login as kakaoLogin } from '@react-native-kakao/user'
import Constants from 'expo-constants'
import * as Notifications from 'expo-notifications'
import { useState } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import AppHeader from '@/design-system/components/AppHeader'
import AppText from '@/design-system/components/AppText'
import Button from '@/design-system/components/Button'
import { COLORS } from '@/design-system/tokens/colors'
import { RADIUS } from '@/design-system/tokens/radius'
import { SPACING } from '@/design-system/tokens/spacing'
import PlaceMap from '@/modules/places/ui-place-map/PlaceMap'
import { bboxAround } from '@/modules/places/util-regions'

// 네이버맵 SDK는 PlaceMap 한 파일만 import한다 (D9)
const SEOUL_BBOX = bboxAround({ lat: 37.5446, lng: 127.0559 })
const noop = () => undefined

const describeError = (error: unknown): string => (error instanceof Error ? error.message : String(error))

const fetchKakaoIdToken = async (): Promise<string> => {
  await initializeKakaoSDK(process.env.EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY ?? '')
  const token = await kakaoLogin()
  return token.idToken ?? '(id_token 없음 — 카카오 콘솔에서 OpenID Connect 활성화 필요)'
}

const fetchGoogleIdToken = async (): Promise<string> => {
  GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  })
  await GoogleSignin.hasPlayServices()
  const response = await GoogleSignin.signIn()
  return response.type === 'success' ? (response.data.idToken ?? '(id_token 없음)') : '(취소됨)'
}

const fetchPushToken = async (): Promise<string> => {
  const permission = await Notifications.requestPermissionsAsync()
  if (!permission.granted) return '(알림 권한 거부)'
  const projectId: unknown = Constants.expoConfig?.extra?.eas?.projectId
  const token = await Notifications.getExpoPushTokenAsync(typeof projectId === 'string' ? { projectId } : undefined)
  return token.data
}

const SpikeScreen = () => {
  const [log, setLog] = useState<string[]>([])

  const run = (label: string, task: () => Promise<string>) => () => {
    task()
      .then((value) => setLog((prev) => [...prev, `${label}: ${value}`]))
      .catch((error: unknown) => setLog((prev) => [...prev, `${label} 실패: ${describeError(error)}`]))
  }

  return (
    <View style={styles.flex}>
      <AppHeader title="네이티브 스파이크" />
      <ScrollView contentContainerStyle={styles.body}>
        <Button label="카카오 로그인 → id_token" onPress={run('kakao', fetchKakaoIdToken)} />
        <Button label="Google 로그인 → id_token" variant="secondary" onPress={run('google', fetchGoogleIdToken)} />
        <Button label="Expo push token" variant="dark" onPress={run('push', fetchPushToken)} />
        <View style={styles.map}>
          <PlaceMap places={[]} initialBbox={SEOUL_BBOX} onBboxIdle={noop} onSelectPlace={noop} />
        </View>
        {log.map((line) => (
          <AppText key={line} variant="caption" selectable>
            {line}
          </AppText>
        ))}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { padding: SPACING.lg, gap: SPACING.md, backgroundColor: COLORS.ground },
  map: { height: 260, borderRadius: RADIUS.xl, overflow: 'hidden' },
})

export default SpikeScreen
