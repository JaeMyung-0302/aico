import Constants from 'expo-constants'
import * as Notifications from 'expo-notifications'
import { useEffect } from 'react'
import { Platform } from 'react-native'
import { requestApi } from '@/shared/api/api-client'

// 이 기기에서 마지막으로 등록한 Expo push token — 로그아웃 때 DELETE 한다(토큰 자체는 로그에 남기지 않는다)
let registeredToken: string | null = null

// getExpoPushTokenAsync 는 EAS projectId 가 있어야 한다 (`eas init` → app.config extra.eas.projectId)
const readProjectId = (): string | null => {
  const fromExtra: unknown = Constants.expoConfig?.extra?.eas?.projectId
  const projectId = typeof fromExtra === 'string' ? fromExtra : Constants.easConfig?.projectId
  return typeof projectId === 'string' && projectId.length > 0 ? projectId : null
}

const ensurePermission = async (): Promise<boolean> => {
  // Android 13+ 는 채널이 있어야 권한 창이 뜬다
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: '알림',
      importance: Notifications.AndroidImportance.DEFAULT,
    })
  }
  const current = await Notifications.getPermissionsAsync()
  if (current.granted) return true
  if (!current.canAskAgain) return false
  const next = await Notifications.requestPermissionsAsync()
  return next.granted
}

// 로그인 후 1회: 권한 요청 → Expo push token → POST /me/push-tokens(멱등). 등록하지 못하면 null
export const registerPushToken = async (): Promise<string | null> => {
  const projectId = readProjectId()
  if (!projectId) {
    if (__DEV__)
      console.warn('[push] EAS projectId 가 없어 푸시 토큰 등록을 건너뜁니다 (eas init 후 extra.eas.projectId)')
    return null
  }
  if (!(await ensurePermission())) return null
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId })
  await requestApi({
    method: 'POST',
    url: '/me/push-tokens',
    data: { token, platform: Platform.OS === 'android' ? 'android' : 'ios' },
  })
  registeredToken = token
  return token
}

// 로그아웃: 기기 세션(토큰)을 먼저 지우므로 지우기 전에 읽어 둔 access token 을 직접 싣는다
export const unregisterPushToken = async (accessToken: string): Promise<void> => {
  const token = registeredToken
  registeredToken = null
  if (!token) return
  await requestApi({
    method: 'DELETE',
    url: `/me/push-tokens/${encodeURIComponent(token)}`,
    headers: { Authorization: `Bearer ${accessToken}` },
  })
}

// 탈퇴: 서버가 이 계정의 푸시 토큰을 이미 지웠다
export const forgetPushToken = (): void => {
  registeredToken = null
}

// 루트 레이아웃: 로그인한 사용자가 정해지면(계정이 바뀌면 다시) 등록한다. 실패해도 앱 흐름은 막지 않는다
export const usePushTokenRegistration = (userId: string | null): void => {
  useEffect(() => {
    if (!userId) return
    registerPushToken().catch(() => undefined)
  }, [userId])
}
