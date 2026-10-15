import { authTokensSchema, type AuthTokens, type DevLoginRequest } from '@miri-pet/shared'
import { requestApi } from '@/shared/api/api-client'

export const devLogin = (body: DevLoginRequest): Promise<AuthTokens> =>
  requestApi({ method: 'POST', url: '/auth/dev', data: body, schema: authTokensSchema })
