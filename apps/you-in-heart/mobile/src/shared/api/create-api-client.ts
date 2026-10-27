import axios, { isAxiosError, type AxiosAdapter, type AxiosError, type AxiosInstance } from 'axios'
import { authTokensSchema } from '@you-in-heart/shared'
import { COUPLE_UNLINKING_CODE } from './api-error'
import type { TokenPair } from './token-store'

// 재시도 1회 제한 표식 (axios 설정 객체에 실어 보낸다)
declare module 'axios' {
  interface AxiosRequestConfig {
    hasRetriedAuth?: boolean
  }
}

type TokenStorage = {
  read: () => Promise<TokenPair | null>
  save: (tokens: TokenPair) => Promise<void>
  clear: () => Promise<void>
}

type CreateApiClientOptions = {
  baseURL: string
  timeout?: number
  adapter?: AxiosAdapter
  tokenStore: TokenStorage
  // refresh가 401(무효·재사용)일 때 — 앱에서는 세션 종료 + /login 이동
  onAuthFailure: () => void
  // 409 (커플이 연결 해제 유예 중) — 상대가 방금 해제했을 수 있으니 /me를 다시 받아 배너를 띄운다
  onCoupleUnlinking?: () => void
}

const AUTH_PATH = /^\/?auth\//
const CONFLICT = 409
const bearer = (accessToken: string) => `Bearer ${accessToken}`

export const createApiClient = ({
  baseURL,
  timeout,
  adapter,
  tokenStore,
  onAuthFailure,
  onCoupleUnlinking,
}: CreateApiClientOptions): AxiosInstance => {
  const client = axios.create({ baseURL, timeout, adapter })
  // refresh 호출은 인터셉터가 없는 별도 인스턴스로 보낸다 (401 무한 루프 방지)
  const refreshClient = axios.create({ baseURL, timeout, adapter })
  let refreshInFlight: Promise<string | null> | null = null

  const runRefresh = async (): Promise<string | null> => {
    const tokens = await tokenStore.read()
    if (!tokens) return null
    try {
      const response = await refreshClient.post<unknown>('/auth/refresh', { refreshToken: tokens.refreshToken })
      const next = authTokensSchema.parse(response.data)
      await tokenStore.save({ accessToken: next.accessToken, refreshToken: next.refreshToken })
      return next.accessToken
    } catch (error) {
      // 세션이 정말 끝난 경우(401)에만 로그아웃한다. 429(레이트 리밋)·네트워크 장애는 토큰을 지키고 이번 요청만 실패시킨다
      if (isAxiosError(error) && error.response?.status === 401) {
        await tokenStore.clear().catch(() => undefined)
        onAuthFailure()
      }
      return null
    }
  }

  // 동시에 들어온 401들은 진행 중인 refresh 하나를 공유한다 (single-flight)
  const refreshAccessToken = (): Promise<string | null> => {
    refreshInFlight ??= runRefresh().finally(() => {
      refreshInFlight = null
    })
    return refreshInFlight
  }

  client.interceptors.request.use(async (config) => {
    if (config.headers.has('Authorization')) return config
    const tokens = await tokenStore.read()
    if (tokens) config.headers.set('Authorization', bearer(tokens.accessToken))
    return config
  })

  client.interceptors.response.use(undefined, async (error: unknown) => {
    if (isAxiosError(error) && error.response?.status === CONFLICT) {
      // code 가 붙은 409(UPLOAD_INCOMPLETE·PURGE_IMMINENT)는 연결 해제가 아니다. code 없음 = 이전 서버의 유예 409
      if (isUnlinkingConflict(error.response.data)) onCoupleUnlinking?.()
      throw error
    }
    if (!isAxiosError(error) || !shouldRefresh(error)) throw error
    const config = error.config
    if (!config) throw error
    const stored = await tokenStore.read()
    if (!stored) throw error
    // 다른 요청이 이미 토큰을 회전시켰다면 refresh 없이 새 토큰으로 재시도한다
    const sentAuthorization = config.headers.get('Authorization')
    const isStale = sentAuthorization !== bearer(stored.accessToken)
    const accessToken = isStale ? stored.accessToken : await refreshAccessToken()
    if (!accessToken) throw error
    config.headers.set('Authorization', bearer(accessToken))
    return client.request({ ...config, hasRetriedAuth: true })
  })

  return client
}

const serverCodeOf = (data: unknown): string | null =>
  typeof data === 'object' && data !== null && 'code' in data && typeof data.code === 'string' ? data.code : null

const isUnlinkingConflict = (data: unknown): boolean => {
  const code = serverCodeOf(data)
  return code === null || code === COUPLE_UNLINKING_CODE
}

const shouldRefresh = (error: AxiosError): boolean =>
  error.response?.status === 401 && error.config?.hasRetriedAuth !== true && !AUTH_PATH.test(error.config?.url ?? '')
