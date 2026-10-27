// ⚠️ Phase 0B 네이티브 스파이크 전용 화면 — 실기기 검증(S1~S6)이 끝나면 삭제한다
import { ExtensionStorage } from '@bacons/apple-targets'
import { NaverMapView } from '@mj-studio/react-native-naver-map'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { initializeKakaoSDK } from '@react-native-kakao/core'
import { login as kakaoLogin } from '@react-native-kakao/user'
import Constants from 'expo-constants'
import * as MediaLibrary from 'expo-media-library'
import { useShareIntentContext } from 'expo-share-intent'
import { useState } from 'react'
import { Platform, Pressable, ScrollView, StyleSheet, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { requestWidgetUpdate } from 'react-native-android-widget'
import DdayWidget, { SNAPSHOT_KEY, WIDGET_NAME } from '@/modules/widget/android/DdayWidget'

const APP_GROUP = 'group.com.aico.youinheart'
const SAMPLE_SNAPSHOT = `스파이크 ${new Date().toLocaleTimeString('ko-KR')}`
const SEOUL = { latitude: 37.5446, longitude: 127.0374, zoom: 13 }

const describeError = (error: unknown): string => (error instanceof Error ? error.message : String(error))

// S1: 토큰 원문은 화면·로그에 남기지 않는다 (길이만)
const checkKakaoLogin = async (): Promise<string> => {
  await initializeKakaoSDK(process.env.EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY ?? '')
  const token = await kakaoLogin()
  return token.idToken
    ? `id_token ${token.idToken.length}자`
    : 'id_token 없음 — 카카오 콘솔에서 OpenID Connect 활성화 필요'
}

// S3: App Group에 쓰고 iOS 위젯을 다시 그린다
const checkIosWidget = async (): Promise<string> => {
  if (Platform.OS !== 'ios') return 'iOS 전용'
  new ExtensionStorage(APP_GROUP).set('snapshot', SAMPLE_SNAPSHOT)
  ExtensionStorage.reloadWidget()
  return `App Group 기록 → 홈 화면 위젯에 "${SAMPLE_SNAPSHOT}"이 보이면 PASS`
}

// S4: AsyncStorage에 쓰고 Android 위젯을 다시 그린다
const checkAndroidWidget = async (): Promise<string> => {
  if (Platform.OS !== 'android') return 'Android 전용'
  await AsyncStorage.setItem(SNAPSHOT_KEY, SAMPLE_SNAPSHOT)
  let isWidgetMissing = false
  await requestWidgetUpdate({
    widgetName: WIDGET_NAME,
    renderWidget: () => <DdayWidget text={SAMPLE_SNAPSHOT} />,
    widgetNotFound: () => {
      isWidgetMissing = true
    },
  })
  return isWidgetMissing ? '홈 화면에 위젯을 먼저 추가하세요' : `위젯에 "${SAMPLE_SNAPSHOT}"이 보이면 PASS`
}

// S6: 최근 사진 10장 중 위치가 있는 건수만 센다 (좌표는 표시하지 않는다)
const checkPhotoLocation = async (): Promise<string> => {
  const permission = await MediaLibrary.requestPermissionsAsync()
  if (!permission.granted) return '사진 권한 거부'
  const page = await MediaLibrary.getAssetsAsync({
    first: 10,
    mediaType: 'photo',
    sortBy: 'creationTime',
  })
  const infos = await Promise.all(page.assets.map((asset) => MediaLibrary.getAssetInfoAsync(asset)))
  const withLocation = infos.filter((info) => info.location != null).length
  return `위치 있는 사진 ${withLocation} / ${infos.length}장`
}

const SpikeScreen = () => {
  const [log, setLog] = useState<string[]>([])
  const [isMapVisible, setIsMapVisible] = useState(false)
  const { hasShareIntent, shareIntent, error: shareError } = useShareIntentContext()

  const append = (line: string) => setLog((prev) => [...prev, line])
  const run = (label: string, task: () => Promise<string>) => () => {
    task()
      .then((value) => append(`${label}: ${value}`))
      .catch((error: unknown) => append(`${label} 실패: ${describeError(error)}`))
  }

  // S5: 카톡에서 공유한 마지막 텍스트(앞 20자만)
  const sharedText = hasShareIntent
    ? (shareIntent.text ?? '(텍스트 없음, 파일 공유)').slice(0, 20)
    : '공유 받은 내용 없음'

  return (
    <SafeAreaView style={styles.flex}>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.title}>네이티브 스파이크 · {Constants.expoConfig?.version}</Text>
        <SpikeButton label="S1 카카오 로그인" onPress={run('S1', checkKakaoLogin)} />
        <SpikeButton label="S2 네이버 지도 보기" onPress={() => setIsMapVisible((prev) => !prev)} />
        {isMapVisible ? <NaverMapView style={styles.map} initialCamera={SEOUL} /> : null}
        <SpikeButton label="S3 iOS 위젯 갱신" onPress={run('S3', checkIosWidget)} />
        <SpikeButton label="S4 Android 위젯 갱신" onPress={run('S4', checkAndroidWidget)} />
        <Text style={styles.line}>S5 공유 받기: {shareError ? `오류 ${shareError}` : sharedText}</Text>
        <SpikeButton label="S6 사진 위치 정보" onPress={run('S6', checkPhotoLocation)} />
        {log.map((line, index) => (
          <Text key={`${index}-${line}`} style={styles.line} selectable>
            {line}
          </Text>
        ))}
      </ScrollView>
    </SafeAreaView>
  )
}

const SpikeButton = ({ label, onPress }: { label: string; onPress: () => void }) => (
  <Pressable accessibilityRole="button" onPress={onPress} style={styles.button}>
    <Text style={styles.buttonText}>{label}</Text>
  </Pressable>
)

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#FFFFFF' },
  body: { padding: 24, gap: 12 },
  title: { fontSize: 20, fontWeight: '700', color: '#17171A', marginBottom: 8 },
  button: {
    minHeight: 48,
    borderRadius: 24,
    backgroundColor: '#CC3355',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  map: { height: 240, borderRadius: 16, overflow: 'hidden' },
  line: { fontSize: 13, color: '#4A4A52' },
})

export default SpikeScreen
