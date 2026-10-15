import { createRequire } from 'node:module'
import { resolve } from 'node:path'

// socket.io-client는 서버 의존성이 아니다(모바일 워크스페이스에만 설치) → 테스트에서만 모바일 패키지 기준으로 불러온다.
// 쓰는 API만 구조적으로 타이핑한다
// TODO: 서버 devDependencies에 socket.io-client를 추가하면(pnpm install 필요) 일반 import로 바꾼다
export type ClientSocket = {
  connected: boolean
  on: (event: string, listener: (...args: unknown[]) => void) => ClientSocket
  off: (event: string) => ClientSocket
  connect: () => ClientSocket
  disconnect: () => ClientSocket
}

type IoOptions = {
  path: string
  transports: string[]
  auth?: Record<string, string>
  reconnection: boolean
  forceNew: boolean
  extraHeaders?: Record<string, string>
}
type IoFactory = (url: string, options: IoOptions) => ClientSocket

const isIoFactory = (value: unknown): value is IoFactory => typeof value === 'function'

const MOBILE_PACKAGE_JSON = resolve(__dirname, '../../../mobile/package.json')

const loadIo = (): IoFactory => {
  const loaded: unknown = createRequire(MOBILE_PACKAGE_JSON)('socket.io-client')
  // CJS 빌드는 module.exports = lookup 함수에 io 속성을 붙인다
  const isModule = (typeof loaded === 'object' || typeof loaded === 'function') && loaded !== null
  const io: unknown = isModule ? Reflect.get(loaded, 'io') : undefined
  if (!isIoFactory(io)) throw new Error('socket.io-client를 불러오지 못했습니다')
  return io
}

const io = loadIo()

// headers: Node websocket 전송은 handshake 헤더를 보낼 수 있다(cf-connecting-ip로 클라이언트 IP 흉내)
export const connectSocket = (baseUrl: string, token?: string, headers?: Record<string, string>): ClientSocket =>
  io(baseUrl, {
    path: '/socket.io',
    transports: ['websocket'],
    ...(token ? { auth: { token } } : {}),
    ...(headers ? { extraHeaders: headers } : {}),
    reconnection: false,
    forceNew: true,
  })

const CONNECT_TIMEOUT_MS = 3000

// 연결되면 'connected', 서버가 handshake를 거부하면 'rejected'
export const waitForConnection = (socket: ClientSocket): Promise<'connected' | 'rejected'> =>
  new Promise((done, fail) => {
    const timer = setTimeout(() => fail(new Error('socket connect timeout')), CONNECT_TIMEOUT_MS)
    socket.on('connect', () => {
      clearTimeout(timer)
      done('connected')
    })
    socket.on('connect_error', () => {
      clearTimeout(timer)
      done('rejected')
    })
  })

const errorMessageOf = (error: unknown): string =>
  typeof error === 'object' && error !== null && typeof Reflect.get(error, 'message') === 'string'
    ? String(Reflect.get(error, 'message'))
    : ''

// 연결 결과 + 거부 사유(서버 미들웨어가 next(new Error(code))로 보낸 message)
export const waitForConnectionDetail = (
  socket: ClientSocket,
): Promise<{ result: 'connected' | 'rejected'; error: string | null }> =>
  new Promise((done, fail) => {
    const timer = setTimeout(() => fail(new Error('socket connect timeout')), CONNECT_TIMEOUT_MS)
    socket.on('connect', () => {
      clearTimeout(timer)
      done({ result: 'connected', error: null })
    })
    socket.on('connect_error', (error: unknown) => {
      clearTimeout(timer)
      done({ result: 'rejected', error: errorMessageOf(error) })
    })
  })

// 서버가 끊으면 사유('io server disconnect')를, 시간 안에 안 끊기면 null
export const waitForDisconnect = (socket: ClientSocket, timeoutMs: number): Promise<string | null> =>
  new Promise((done) => {
    const timer = setTimeout(() => done(null), timeoutMs)
    socket.on('disconnect', (reason: unknown) => {
      clearTimeout(timer)
      done(typeof reason === 'string' ? reason : String(reason))
    })
  })

// 이벤트를 모은다 → 테스트가 시간 안에 왔는지/안 왔는지 확인
export const collectEvents = (socket: ClientSocket, event: string) => {
  let received: readonly unknown[] = []
  socket.on(event, (payload: unknown) => {
    received = [...received, payload]
  })
  return () => received
}

export const waitUntil = async (predicate: () => boolean, timeoutMs: number): Promise<boolean> => {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    if (predicate()) return true
    await new Promise((tick) => setTimeout(tick, 10))
  }
  return predicate()
}
