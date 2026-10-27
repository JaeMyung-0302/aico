import { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios'
import { createApiClient } from '../create-api-client'
import type { TokenPair } from '../token-store'

const BASE_URL = 'http://api.test/api/v1'
const OLD = { accessToken: 'access-old', refreshToken: 'refresh-old' }
const NEW = { accessToken: 'access-new', refreshToken: 'refresh-new' }
const REFRESH_RESPONSE = { ...NEW, accessTokenExpiresIn: 900, isNewUser: false }

// 기기 보안 저장소 대신 메모리 저장소 (네트워크·저장소만 대체한다)
const createMemoryTokenStore = (initial: TokenPair | null) => {
  let current = initial
  return {
    read: jest.fn(async () => current),
    save: jest.fn(async (tokens: TokenPair) => {
      current = tokens
    }),
    clear: jest.fn(async () => {
      current = null
    }),
    peek: () => current,
  }
}

type FakeServerOptions = { refreshStatus: number; refreshDelayMs?: number; isUnlinking?: boolean }

// 가짜 서버: access-new 토큰만 통과시키고, /auth/refresh 호출 수를 센다
const createFakeServer = ({ refreshStatus, refreshDelayMs = 0, isUnlinking = false }: FakeServerOptions) => {
  const refreshBodies: unknown[] = []
  const calls = { refresh: 0, refreshBodies }
  const respond = (config: InternalAxiosRequestConfig, status: number, data: unknown) => {
    const response = { data, status, statusText: '', headers: {}, config }
    if (status >= 400) throw new AxiosError('Request failed', 'ERR_BAD_REQUEST', config, null, response)
    return response
  }
  const adapter: AxiosAdapter = async (config) => {
    if (config.url?.endsWith('/auth/refresh')) {
      calls.refresh += 1
      calls.refreshBodies.push(typeof config.data === 'string' ? JSON.parse(config.data) : config.data)
      await new Promise((resolve) => setTimeout(resolve, refreshDelayMs))
      return respond(config, refreshStatus, refreshStatus === 200 ? REFRESH_RESPONSE : { message: 'invalid' })
    }
    const authorization = config.headers.get('Authorization')
    // 연결 해제 유예 중이면 서버(CoupleGuard)는 쓰기 요청에 409
    if (isUnlinking && config.method !== 'get')
      return respond(config, 409, { statusCode: 409, message: '연결 해제 유예 중이에요' })
    return authorization === `Bearer ${NEW.accessToken}`
      ? respond(config, 200, { ok: true, url: config.url })
      : respond(config, 401, { message: 'unauthorized' })
  }
  return { adapter, calls }
}

const setup = (options: FakeServerOptions, initialTokens: TokenPair | null = OLD) => {
  const server = createFakeServer(options)
  const tokenStore = createMemoryTokenStore(initialTokens)
  const onAuthFailure = jest.fn()
  const onCoupleUnlinking = jest.fn()
  const client = createApiClient({
    baseURL: BASE_URL,
    adapter: server.adapter,
    tokenStore,
    onAuthFailure,
    onCoupleUnlinking,
  })
  return { client, server, tokenStore, onAuthFailure, onCoupleUnlinking }
}

describe('createApiClient 401 인터셉터', () => {
  it('저장된 access token을 Authorization 헤더로 싣는다', async () => {
    const { client } = setup({ refreshStatus: 200 }, NEW)
    await expect(client.get('/me')).resolves.toMatchObject({ status: 200 })
  })

  it('401이면 refresh를 1회 호출하고 새 토큰으로 원 요청을 재시도한다', async () => {
    const { client, server, tokenStore, onAuthFailure } = setup({ refreshStatus: 200 })

    const response = await client.get('/me')

    expect(response.data).toEqual({ ok: true, url: '/me' })
    expect(server.calls.refresh).toBe(1)
    expect(server.calls.refreshBodies[0]).toEqual({ refreshToken: OLD.refreshToken })
    expect(tokenStore.peek()).toEqual(NEW)
    expect(onAuthFailure).not.toHaveBeenCalled()
  })

  it('refresh도 401이면 토큰을 지우고 onAuthFailure(로그인 이동)를 호출한 뒤 실패를 전달한다', async () => {
    const { client, server, tokenStore, onAuthFailure } = setup({ refreshStatus: 401 })

    await expect(client.get('/me')).rejects.toMatchObject({ response: { status: 401 } })

    expect(server.calls.refresh).toBe(1)
    expect(tokenStore.clear).toHaveBeenCalledTimes(1)
    expect(tokenStore.peek()).toBeNull()
    expect(onAuthFailure).toHaveBeenCalledTimes(1)
  })

  it('동시에 발생한 401들은 refresh 1번을 공유한다 (single-flight)', async () => {
    const { client, server, onAuthFailure } = setup({ refreshStatus: 200, refreshDelayMs: 20 })

    const responses = await Promise.all([client.get('/a'), client.get('/b'), client.get('/c')])

    expect(responses.map((response) => response.data.url)).toEqual(['/a', '/b', '/c'])
    expect(server.calls.refresh).toBe(1)
    expect(onAuthFailure).not.toHaveBeenCalled()
  })

  it('동시 401에서 refresh가 실패해도 onAuthFailure는 1번만 호출된다', async () => {
    const { client, server, onAuthFailure } = setup({ refreshStatus: 401, refreshDelayMs: 20 })

    const results = await Promise.allSettled([client.get('/a'), client.get('/b')])

    expect(results.every((result) => result.status === 'rejected')).toBe(true)
    expect(server.calls.refresh).toBe(1)
    expect(onAuthFailure).toHaveBeenCalledTimes(1)
  })

  it('refresh 직후 도착한 이전 토큰의 401은 refresh 없이 새 토큰으로 재시도한다', async () => {
    const { client, server, tokenStore } = setup({ refreshStatus: 200 })
    await client.get('/first')
    expect(server.calls.refresh).toBe(1)

    // 다른 요청이 이미 회전시킨 상태에서, 옛 토큰을 실은 요청이 401을 받는 경우
    await tokenStore.save(NEW)
    const response = await client.get('/late', { headers: { Authorization: `Bearer ${OLD.accessToken}` } })

    expect(response.data).toEqual({ ok: true, url: '/late' })
    expect(server.calls.refresh).toBe(1)
  })

  it('저장된 토큰이 없으면 refresh 없이 401을 그대로 전달한다', async () => {
    const { client, server, onAuthFailure } = setup({ refreshStatus: 200 }, null)

    await expect(client.get('/me')).rejects.toMatchObject({ response: { status: 401 } })

    expect(server.calls.refresh).toBe(0)
    expect(onAuthFailure).not.toHaveBeenCalled()
  })

  it('로그인 요청(/auth/*)의 401은 refresh하지 않는다', async () => {
    const { client, server } = setup({ refreshStatus: 200 })

    await expect(client.post('/auth/kakao', { idToken: 'bad' })).rejects.toMatchObject({ response: { status: 401 } })

    expect(server.calls.refresh).toBe(0)
  })

  it.each([429, 503])('refresh가 %s(레이트 리밋·장애)면 로그아웃하지 않고 원 요청만 실패시킨다', async (status) => {
    const { client, tokenStore, onAuthFailure } = setup({ refreshStatus: status })

    await expect(client.get('/me')).rejects.toMatchObject({ response: { status: 401 } })

    expect(tokenStore.clear).not.toHaveBeenCalled()
    expect(tokenStore.peek()).toEqual(OLD)
    expect(onAuthFailure).not.toHaveBeenCalled()
  })

  it('409(연결 해제 유예 중)면 onCoupleUnlinking을 부르고 로그아웃·refresh 없이 실패를 전달한다', async () => {
    const { client, server, tokenStore, onAuthFailure, onCoupleUnlinking } = setup(
      { refreshStatus: 200, isUnlinking: true },
      NEW,
    )

    await expect(client.post('/couples/invites')).rejects.toMatchObject({ response: { status: 409 } })

    expect(onCoupleUnlinking).toHaveBeenCalledTimes(1)
    expect(onAuthFailure).not.toHaveBeenCalled()
    expect(tokenStore.clear).not.toHaveBeenCalled()
    expect(server.calls.refresh).toBe(0)
  })

  it('서버 code 가 붙은 409(UPLOAD_INCOMPLETE·PURGE_IMMINENT)는 연결 해제로 보지 않는다', async () => {
    const onCoupleUnlinking = jest.fn()
    const adapter: AxiosAdapter = async (config) => {
      const response = { data: { statusCode: 409, code: 'UPLOAD_INCOMPLETE', message: 'x' }, status: 409, statusText: '', headers: {}, config }
      throw new AxiosError('Request failed', 'ERR_BAD_RESPONSE', config, null, response)
    }
    const client = createApiClient({
      baseURL: BASE_URL,
      adapter,
      tokenStore: createMemoryTokenStore(NEW),
      onAuthFailure: jest.fn(),
      onCoupleUnlinking,
    })

    await expect(client.post('/photos/x/complete')).rejects.toMatchObject({ response: { status: 409 } })
    expect(onCoupleUnlinking).not.toHaveBeenCalled()
  })

  it('유예 중에도 GET은 통과하고 onCoupleUnlinking을 부르지 않는다', async () => {
    const { client, onCoupleUnlinking } = setup({ refreshStatus: 200, isUnlinking: true }, NEW)

    await expect(client.get('/couples/me')).resolves.toMatchObject({ status: 200 })

    expect(onCoupleUnlinking).not.toHaveBeenCalled()
  })
})
