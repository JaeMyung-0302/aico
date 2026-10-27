import { authTokensSchema, type AuthTokens } from '@you-in-heart/shared'
import { Platform } from 'react-native'
import { requestApi } from '@/shared/api/api-client'

const MAX_DEVICE_LABEL = 100

// 서버 세션 목록에서 기기를 구분하는 이름 (개인정보 없음)
export const describeDevice = (): string => `${Platform.OS} ${String(Platform.Version)}`.slice(0, MAX_DEVICE_LABEL)

export const loginWithKakao = (idToken: string): Promise<AuthTokens> =>
  requestApi({
    method: 'POST',
    url: '/auth/kakao',
    data: { idToken, deviceLabel: describeDevice() },
    schema: authTokensSchema,
  })

export const logoutSession = (refreshToken: string): Promise<void> =>
  requestApi({ method: 'POST', url: '/auth/logout', data: { refreshToken } })
