import type { TokenPair } from '@/shared/api/token-store'

export type SessionStatus = 'loading' | 'signedOut' | 'signedIn'

type TokenStorage = {
  read: () => Promise<TokenPair | null>
  save: (tokens: TokenPair) => Promise<void>
  clear: () => Promise<void>
}

type CreateSessionStoreOptions = {
  tokenStore: TokenStorage
  // 세션이 끝날 때 사용자 캐시(React Query 등)를 비운다
  onSessionEnd: () => void
}

// 로그인 여부의 단일 출처. 화면 이동은 인증 게이트(_layout)가 이 상태를 보고 결정한다
export const createSessionStore = ({ tokenStore, onSessionEnd }: CreateSessionStoreOptions) => {
  let status: SessionStatus = 'loading'
  let listeners: readonly (() => void)[] = []

  const setStatus = (next: SessionStatus) => {
    status = next
    listeners.forEach((listener) => listener())
  }

  return {
    getStatus: (): SessionStatus => status,
    subscribe: (listener: () => void) => {
      listeners = [...listeners, listener]
      return () => {
        listeners = listeners.filter((item) => item !== listener)
      }
    },
    bootstrap: async () => {
      const tokens = await tokenStore.read().catch(() => null)
      setStatus(tokens ? 'signedIn' : 'signedOut')
    },
    signIn: async (tokens: TokenPair) => {
      await tokenStore.save(tokens)
      setStatus('signedIn')
    },
    // 토큰이 이미 지워진 경우(refresh 실패)에도 쓸 수 있도록 clear 실패는 무시한다
    endSession: async () => {
      await tokenStore.clear().catch(() => undefined)
      onSessionEnd()
      setStatus('signedOut')
    },
  }
}

export type SessionStore = ReturnType<typeof createSessionStore>
