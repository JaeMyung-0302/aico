import { session } from '@/shared/auth/session'
import { ME_QUERY_KEY } from '@/shared/auth/query-keys'
import { API_BASE_URL } from '@/shared/config/api-base-url'
import { queryClient } from '@/shared/query-client'
import { createApiClient } from './create-api-client'
import { createRequestApi } from './request-api'
import { tokenStore } from './token-store'

const REQUEST_TIMEOUT_MS = 15_000

// 401 → refresh 1회(동시 401은 한 번만) → 재시도. refresh가 401이면 세션을 끝내고 게이트가 /login으로 보낸다
// 409(연결 해제 유예 중) → /me를 다시 받아 홈 배너·설정의 연결 상태를 갱신한다
export const apiClient = createApiClient({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT_MS,
  tokenStore,
  onAuthFailure: () => {
    session.endSession().catch(() => undefined)
  },
  onCoupleUnlinking: () => {
    queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY }).catch(() => undefined)
  },
})

export const requestApi = createRequestApi(apiClient)
