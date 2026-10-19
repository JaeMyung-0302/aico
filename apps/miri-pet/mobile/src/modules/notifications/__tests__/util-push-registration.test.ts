import * as Notifications from 'expo-notifications'
import { requestApi } from '@/shared/api/api-client'
import { registerPushToken, unregisterPushToken } from '../util-push-registration'

// 경계만 대체: 기기 알림 모듈, 앱 설정(EAS projectId), 서버 API
jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  AndroidImportance: { HIGH: 4 },
  PermissionStatus: { GRANTED: 'granted', DENIED: 'denied', UNDETERMINED: 'undetermined' },
}))
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { extra: { eas: { projectId: 'eas-project-1' } } } },
}))
jest.mock('@/shared/api/api-client', () => ({ requestApi: jest.fn() }))

const TOKEN = 'ExponentPushToken[device-1]'
type PermissionResponse = Awaited<ReturnType<typeof Notifications.getPermissionsAsync>>
const permission = (granted: boolean, canAskAgain = true): PermissionResponse => ({
  granted,
  canAskAgain,
  expires: 'never',
  status: granted ? Notifications.PermissionStatus.GRANTED : Notifications.PermissionStatus.DENIED,
})

beforeEach(() => {
  jest.clearAllMocks()
  jest.mocked(Notifications.getExpoPushTokenAsync).mockResolvedValue({ type: 'expo', data: TOKEN })
  jest.mocked(requestApi).mockResolvedValue(undefined)
})

describe('registerPushToken', () => {
  it('권한이 이미 있으면 토큰을 받아 PUT /push-tokens로 등록한다', async () => {
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue(permission(true))

    await expect(registerPushToken({ shouldRequestPermission: false })).resolves.toBe('registered')

    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled()
    expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalledWith({ projectId: 'eas-project-1' })
    expect(requestApi).toHaveBeenCalledWith({
      method: 'PUT',
      url: '/push-tokens',
      data: { expoToken: TOKEN, platform: 'ios' },
    })
  })

  it('앱 시작 재등록(요청 안 함)에서 권한이 없으면 묻지 않고 끝낸다', async () => {
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue(permission(false))
    await expect(registerPushToken({ shouldRequestPermission: false })).resolves.toBe('denied')
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled()
    expect(requestApi).not.toHaveBeenCalled()
  })

  it('03 완료 시점(요청함)에는 권한을 묻고, 허용하면 등록한다', async () => {
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue(permission(false))
    jest.mocked(Notifications.requestPermissionsAsync).mockResolvedValue(permission(true))
    await expect(registerPushToken({ shouldRequestPermission: true })).resolves.toBe('registered')
    expect(requestApi).toHaveBeenCalledTimes(1)
  })

  it('다시 물을 수 없는 거부 상태면 요청 창을 띄우지 않는다', async () => {
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue(permission(false, false))
    await expect(registerPushToken({ shouldRequestPermission: true })).resolves.toBe('denied')
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled()
  })

  it('시뮬레이터 등에서 토큰 발급이 실패하면 unavailable (예외를 올리지 않는다)', async () => {
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue(permission(true))
    jest.mocked(Notifications.getExpoPushTokenAsync).mockRejectedValue(new Error('no device'))
    await expect(registerPushToken({ shouldRequestPermission: false })).resolves.toBe('unavailable')
    expect(requestApi).not.toHaveBeenCalled()
  })
})

describe('unregisterPushToken', () => {
  it('이 기기 토큰을 DELETE /push-tokens로 지운다 (로그아웃 직전)', async () => {
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue(permission(true))
    await unregisterPushToken()
    expect(requestApi).toHaveBeenCalledWith({ method: 'DELETE', url: '/push-tokens', data: { expoToken: TOKEN } })
  })

  it('세션을 먼저 지운 로그아웃: 넘겨받은 access token으로 인증해 지운다', async () => {
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue(permission(true))
    await unregisterPushToken('old-access')
    expect(requestApi).toHaveBeenCalledWith({
      method: 'DELETE',
      url: '/push-tokens',
      data: { expoToken: TOKEN },
      headers: { Authorization: 'Bearer old-access' },
    })
  })

  it('권한이 없으면 등록된 토큰도 없으므로 아무것도 하지 않는다', async () => {
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue(permission(false))
    await unregisterPushToken()
    expect(requestApi).not.toHaveBeenCalled()
  })
})
