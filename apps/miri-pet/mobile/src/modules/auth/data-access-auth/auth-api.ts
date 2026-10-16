import { authTokensSchema, type AuthProvider, type AuthTokens } from '@miri-pet/shared'
import { requestApi } from '@/shared/api/api-client'

const PROVIDER_PATH: Record<AuthProvider, string> = { KAKAO: '/auth/kakao', GOOGLE: '/auth/google' }

export const loginWithIdToken = (provider: AuthProvider, idToken: string): Promise<AuthTokens> =>
  requestApi({ method: 'POST', url: PROVIDER_PATH[provider], data: { idToken }, schema: authTokensSchema })

export const logoutSession = (refreshToken: string): Promise<void> =>
  requestApi({ method: 'POST', url: '/auth/logout', data: { refreshToken } })
