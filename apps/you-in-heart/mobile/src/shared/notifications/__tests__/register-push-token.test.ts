import { renderHook, waitFor } from '@testing-library/react-native'
import { PermissionStatus } from 'expo'
import * as Notifications from 'expo-notifications'
import { requestApi } from '@/shared/api/api-client'
import {
  forgetPushToken,
  registerPushToken,
  unregisterPushToken,
  usePushTokenRegistration,
} from '../register-push-token'

let mockProjectId: string | undefined

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    get expoConfig() {
      return { extra: mockProjectId ? { eas: { projectId: mockProjectId } } : {} }
    },
    easConfig: null,
  },
}))
jest.mock('expo-notifications', () => ({
  AndroidImportance: { DEFAULT: 3 },
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(async () => null),
}))
jest.mock('@/shared/api/api-client', () => ({ requestApi: jest.fn(async () => undefined) }))

const TOKEN = 'ExponentPushToken[abc/def+1]'
const permission = (status: PermissionStatus, canAskAgain: boolean): Notifications.NotificationPermissionsStatus => ({
  status,
  granted: status === PermissionStatus.GRANTED,
  canAskAgain,
  expires: 'never',
})
const GRANTED = permission(PermissionStatus.GRANTED, true)
const UNDETERMINED = permission(PermissionStatus.UNDETERMINED, true)
const DENIED = permission(PermissionStatus.DENIED, false)

const mockPermissions = (
  current: Notifications.NotificationPermissionsStatus,
  afterRequest: Notifications.NotificationPermissionsStatus = current,
) => {
  jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue(current)
  jest.mocked(Notifications.requestPermissionsAsync).mockResolvedValue(afterRequest)
}

beforeEach(() => {
  jest.clearAllMocks()
  forgetPushToken()
  mockProjectId = 'eas-project-id'
  jest.spyOn(console, 'warn').mockImplementation(() => undefined)
  mockPermissions(GRANTED)
  jest.mocked(Notifications.getExpoPushTokenAsync).mockResolvedValue({ type: 'expo', data: TOKEN })
})

afterEach(() => {
  jest.restoreAllMocks()
})

describe('registerPushToken', () => {
  it('권한이 있으면 Expo push token 을 받아 POST /me/push-tokens 로 등록한다', async () => {
    await expect(registerPushToken()).resolves.toBe(TOKEN)
    expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalledWith({ projectId: 'eas-project-id' })
    expect(requestApi).toHaveBeenCalledWith({
      method: 'POST',
      url: '/me/push-tokens',
      data: { token: TOKEN, platform: 'ios' },
    })
  })

  it('권한을 아직 묻지 않았으면 요청하고, 허용하면 등록한다', async () => {
    mockPermissions(UNDETERMINED, GRANTED)
    await expect(registerPushToken()).resolves.toBe(TOKEN)
    expect(Notifications.requestPermissionsAsync).toHaveBeenCalledTimes(1)
  })

  it('권한을 거부하면 등록하지 않는다(다시 묻지 못하면 요청도 하지 않는다)', async () => {
    mockPermissions(DENIED)
    await expect(registerPushToken()).resolves.toBeNull()
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled()
    expect(requestApi).not.toHaveBeenCalled()

    mockPermissions(UNDETERMINED, DENIED)
    await expect(registerPushToken()).resolves.toBeNull()
    expect(requestApi).not.toHaveBeenCalled()
  })

  it('EAS projectId 가 없으면(eas init 전) 권한도 묻지 않고 개발 경고만 남기고 건너뛴다', async () => {
    mockProjectId = undefined
    await expect(registerPushToken()).resolves.toBeNull()
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('projectId'))
    expect(Notifications.getPermissionsAsync).not.toHaveBeenCalled()
    expect(Notifications.getExpoPushTokenAsync).not.toHaveBeenCalled()
    expect(requestApi).not.toHaveBeenCalled()
  })
})

describe('unregisterPushToken', () => {
  it('등록한 토큰을 URL 인코딩해 DELETE 하고, 지운 세션의 access token 을 직접 싣는다', async () => {
    await registerPushToken()
    jest.mocked(requestApi).mockClear()

    await unregisterPushToken('access-1')
    expect(requestApi).toHaveBeenCalledWith({
      method: 'DELETE',
      url: `/me/push-tokens/${encodeURIComponent(TOKEN)}`,
      headers: { Authorization: 'Bearer access-1' },
    })
    // 한 번 해제하면 다시 보내지 않는다
    await unregisterPushToken('access-1')
    expect(requestApi).toHaveBeenCalledTimes(1)
  })

  it('등록한 적이 없으면(권한 거부·projectId 없음) 보내지 않는다', async () => {
    await unregisterPushToken('access-1')
    expect(requestApi).not.toHaveBeenCalled()
  })
})

describe('usePushTokenRegistration', () => {
  it('로그인한 사용자 id 가 생기면 1회 등록하고, 같은 id 로 다시 그려져도 반복하지 않는다', async () => {
    type Props = { userId: string | null }
    const initialProps: Props = { userId: null }
    const { rerender } = await renderHook(({ userId }: Props) => usePushTokenRegistration(userId), { initialProps })
    expect(requestApi).not.toHaveBeenCalled()

    await rerender({ userId: 'user-1' })
    await waitFor(() => expect(requestApi).toHaveBeenCalledTimes(1))
    await rerender({ userId: 'user-1' })
    expect(requestApi).toHaveBeenCalledTimes(1)
  })

  it('등록이 실패해도 처리되지 않은 거부가 없다', async () => {
    jest.mocked(Notifications.getExpoPushTokenAsync).mockRejectedValue(new Error('simulator'))
    await renderHook(() => usePushTokenRegistration('user-1'))
    await waitFor(() => expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalled())
    expect(requestApi).not.toHaveBeenCalled()
  })
})
