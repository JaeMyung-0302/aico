import type { TokenPair } from '@/shared/api/token-store'
import { createSessionStore } from '../session-store'

const TOKENS = { accessToken: 'a', refreshToken: 'r' }

const createMemoryTokenStore = (initial: TokenPair | null) => {
  let current = initial
  return {
    read: async () => current,
    save: async (tokens: TokenPair) => {
      current = tokens
    },
    clear: async () => {
      current = null
    },
    peek: () => current,
  }
}

describe('createSessionStore', () => {
  it('처음에는 loading이고, 저장된 토큰이 있으면 signedIn으로 시작한다', async () => {
    const store = createSessionStore({ tokenStore: createMemoryTokenStore(TOKENS), onSessionEnd: jest.fn() })
    expect(store.getStatus()).toBe('loading')

    await store.bootstrap()

    expect(store.getStatus()).toBe('signedIn')
  })

  it('저장된 토큰이 없으면 signedOut으로 시작한다', async () => {
    const store = createSessionStore({ tokenStore: createMemoryTokenStore(null), onSessionEnd: jest.fn() })
    await store.bootstrap()
    expect(store.getStatus()).toBe('signedOut')
  })

  it('signIn은 토큰을 저장하고 구독자에게 signedIn을 알린다', async () => {
    const tokenStore = createMemoryTokenStore(null)
    const store = createSessionStore({ tokenStore, onSessionEnd: jest.fn() })
    const listener = jest.fn()
    store.subscribe(listener)

    await store.signIn(TOKENS)

    expect(tokenStore.peek()).toEqual(TOKENS)
    expect(store.getStatus()).toBe('signedIn')
    expect(listener).toHaveBeenCalled()
  })

  it('endSession은 토큰을 지우고 캐시 정리 콜백을 부른 뒤 signedOut이 된다', async () => {
    const tokenStore = createMemoryTokenStore(TOKENS)
    const onSessionEnd = jest.fn()
    const store = createSessionStore({ tokenStore, onSessionEnd })
    await store.bootstrap()

    await store.endSession()

    expect(tokenStore.peek()).toBeNull()
    expect(onSessionEnd).toHaveBeenCalledTimes(1)
    expect(store.getStatus()).toBe('signedOut')
  })

  it('구독 해제 후에는 알림을 받지 않는다', async () => {
    const store = createSessionStore({ tokenStore: createMemoryTokenStore(null), onSessionEnd: jest.fn() })
    const listener = jest.fn()
    const unsubscribe = store.subscribe(listener)
    unsubscribe()

    await store.signIn(TOKENS)

    expect(listener).not.toHaveBeenCalled()
  })
})
