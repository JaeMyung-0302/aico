import { markConsentRequired } from '@/shared/auth/mark-consent-required'
import { session } from '@/shared/auth/session'
import { API_BASE_URL } from '@/shared/config/api-base-url'
import { queryClient } from '@/shared/query-client'
import { createApiClient } from './create-api-client'
import { createRequestApi } from './request-api'
import { tokenStore } from './token-store'

const REQUEST_TIMEOUT_MS = 15_000

// 401 → refresh 1회(동시 401은 한 번만) → 재시도. refresh가 401이면 세션을 끝내고 게이트가 /login으로 보낸다
// 403 CONSENT_REQUIRED면 로그아웃 없이 게이트가 /consent로 보낸다
export const apiClient = createApiClient({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT_MS,
  tokenStore,
  onAuthFailure: () => {
    session.endSession().catch(() => undefined)
  },
  onConsentRequired: () => markConsentRequired(queryClient),
})

export const requestApi = createRequestApi(apiClient)
