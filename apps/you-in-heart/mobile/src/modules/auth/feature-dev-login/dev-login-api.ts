import { authTokensSchema, type AuthTokens, type DevLoginRequest } from '@you-in-heart/shared'
import { requestApi } from '@/shared/api/api-client'

// 같은 devKey면 같은 사용자 → 시뮬레이터 두 대에서 'dev-a'·'dev-b'로 페어링을 시험한다
export const devLogin = (body: DevLoginRequest): Promise<AuthTokens> =>
  requestApi({ method: 'POST', url: '/auth/dev-login', data: body, schema: authTokensSchema })
