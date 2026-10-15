import Constants from 'expo-constants'
import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import { requestApi } from '@/shared/api/api-client'

export type PushRegistrationResult = 'registered' | 'denied' | 'unavailable'

const ANDROID_CHANNEL_ID = 'default'

const readProjectId = (): string | null => {
  const projectId: unknown = Constants.expoConfig?.extra?.eas?.projectId
  return typeof projectId === 'string' && projectId.length > 0 ? projectId : null
}

const ensurePermission = async (shouldRequestPermission: boolean): Promise<boolean> => {
  const current = await Notifications.getPermissionsAsync()
  if (current.granted) return true
  if (!shouldRequestPermission || !current.canAskAgain) return false
  const requested = await Notifications.requestPermissionsAsync()
  return requested.granted
}

// 시뮬레이터·projectId 미설정이면 null (실기기 전용 기능)
const readExpoToken = async (): Promise<string | null> => {
  const projectId = readProjectId()
  if (!projectId) return null
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
        name: '접종 알림',
        importance: Notifications.AndroidImportance.HIGH,
      })
    }
    return (await Notifications.getExpoPushTokenAsync({ projectId })).data
  } catch {
    return null
  }
}

// D6·plan 2.15: 권한이 허용되면 Expo 토큰을 발급해 PUT /push-tokens (서버 upsert라 앱 시작마다 불러도 된다)
// shouldRequestPermission: 03 펫 만들기 완료 때만 true — 앱 시작 재등록은 권한 창을 띄우지 않는다
export const registerPushToken = async ({
  shouldRequestPermission,
}: {
  shouldRequestPermission: boolean
}): Promise<PushRegistrationResult> => {
  if (!(await ensurePermission(shouldRequestPermission))) return 'denied'
  const expoToken = await readExpoToken()
  if (!expoToken) return 'unavailable'
  await requestApi({
    method: 'PUT',
    url: '/push-tokens',
    data: { expoToken, platform: Platform.OS === 'ios' ? 'ios' : 'android' },
  })
  return 'registered'
}

// 로그아웃 직전에 호출해 이 기기로 더 보내지 않게 한다 (TODO: useLogout에 연결 — Phase 1 소유 파일)
export const unregisterPushToken = async (): Promise<void> => {
  if (!(await ensurePermission(false))) return
  const expoToken = await readExpoToken()
  if (!expoToken) return
  await requestApi({ method: 'DELETE', url: '/push-tokens', data: { expoToken } })
}
