import { Inject, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { type OnGatewayConnection, type OnGatewayInit, WebSocketGateway, WebSocketServer } from '@nestjs/websockets'
import { DM_SOCKET_ERRORS, DM_SOCKET_PATH } from '@miri-pet/shared'
import { DmRealtime } from '../realtime/dm-realtime'
import { userRoom } from './dm-rules'
import { type HandshakeLike, SocketAuthenticator } from './socket-auth'
import {
  DM_SOCKET_LIMITS,
  type DmSocketLimits,
  HandshakeRateLimiter,
  handshakeClientIp,
  hasSocketCapacity,
  tokenExpiryDelayMs,
} from './socket-limits'

// socket.io는 서버의 직접 의존성이 아니라(@nestjs/platform-socket.io 내부) 쓰는 API만 구조적으로 타이핑한다
type SocketLike = {
  handshake: HandshakeLike & { address: string }
  data: unknown
  join: (room: string) => unknown
  disconnect: (close?: boolean) => unknown
  on: (event: 'disconnect', listener: () => void) => unknown
}
type Middleware = (socket: SocketLike, next: (error?: Error) => void) => void
type RealtimeServer = {
  use: (middleware: Middleware) => unknown
  to: (room: string) => { emit: (event: string, payload: unknown) => unknown }
  in: (room: string) => {
    fetchSockets: () => Promise<readonly unknown[]>
    disconnectSockets: (close?: boolean) => void
  }
  // 기본 네임스페이스의 room → socket id 집합(동기). 사용자당 소켓 수를 센다
  sockets: { adapter: { rooms: ReadonlyMap<string, ReadonlySet<string>> } }
}

type SocketSession = { userId: string; exp: number }

const sessionOf = (socket: SocketLike): SocketSession | null => {
  const data = socket.data
  if (typeof data !== 'object' || data === null) return null
  const userId: unknown = Reflect.get(data, 'userId')
  const exp: unknown = Reflect.get(data, 'exp')
  return typeof userId === 'string' && typeof exp === 'number' ? { userId, exp } : null
}

// D5: 쓰기는 REST, 소켓은 서버→클라 알림(message:new, message:read)만. 클라가 보내는 이벤트 핸들러는 없다.
// handshake: IP당 횟수 제한 → access JWT 검증 → 사용자당 소켓 상한(거부 시 connect_error message = DM_SOCKET_ERRORS).
// 검증된 id의 room user:{id}에만 넣고, access token 만료 시각에 끊는다(앱이 갱신된 토큰으로 다시 연결)
@WebSocketGateway({ path: DM_SOCKET_PATH })
export class DmGateway implements OnGatewayInit, OnGatewayConnection {
  private readonly logger = new Logger(DmGateway.name)
  private readonly handshakes: HandshakeRateLimiter
  private readonly trustProxyHops: number

  @WebSocketServer()
  private server?: RealtimeServer

  constructor(
    private readonly authenticator: SocketAuthenticator,
    private readonly realtime: DmRealtime,
    @Inject(DM_SOCKET_LIMITS) private readonly limits: DmSocketLimits,
    config: ConfigService,
  ) {
    this.handshakes = new HandshakeRateLimiter(limits.handshakesPerIp, limits.handshakeWindowMs)
    this.trustProxyHops = config.get<number>('trustProxyHops') ?? 0
  }

  afterInit(server: RealtimeServer): void {
    server.use((socket, next) => {
      if (!this.handshakes.tryAcquire(handshakeClientIp(socket.handshake, this.trustProxyHops))) {
        next(new Error(DM_SOCKET_ERRORS.rateLimited))
        return
      }
      this.authenticator
        .authenticate(socket.handshake)
        .then(({ userId, exp }) => {
          if (!hasSocketCapacity(this.socketCount(server, userId), this.limits.maxSocketsPerUser)) {
            next(new Error(DM_SOCKET_ERRORS.tooManyConnections))
            return
          }
          socket.data = { userId, exp }
          next()
        })
        .catch(() => next(new Error(DM_SOCKET_ERRORS.unauthorized)))
    })
    // LOW-1: 로그아웃·정지·탈퇴 → 그 사용자의 소켓을 모두 끊는다
    this.realtime.register((userId) => server.in(userRoom(userId)).disconnectSockets(true))
  }

  handleConnection(socket: SocketLike): void {
    const session = sessionOf(socket)
    if (!session) {
      socket.disconnect(true)
      return
    }
    socket.join(userRoom(session.userId))
    // 동시 handshake가 함께 상한 검사를 통과한 경우: 넘친 소켓은 바로 끊는다
    if (this.server && this.socketCount(this.server, session.userId) > this.limits.maxSocketsPerUser) {
      socket.disconnect(true)
      return
    }
    const timer = setTimeout(() => socket.disconnect(true), tokenExpiryDelayMs(session.exp, Date.now()))
    timer.unref()
    socket.on('disconnect', () => clearTimeout(timer))
  }

  emitToUser(userId: string, event: string, payload: unknown): void {
    this.server?.to(userRoom(userId)).emit(event, payload)
  }

  // 단일 인스턴스(D5)라 이 서버의 room만 보면 된다. 확인 실패는 오프라인으로 본다(푸시가 대신 간다)
  async isOnline(userId: string): Promise<boolean> {
    if (!this.server) return false
    try {
      const sockets = await this.server.in(userRoom(userId)).fetchSockets()
      return sockets.length > 0
    } catch (error) {
      this.logger.warn(
        `[dm] presence check failed ${userId}: ${error instanceof Error ? error.message : String(error)}`,
      )
      return false
    }
  }

  private socketCount(server: RealtimeServer, userId: string): number {
    return server.sockets.adapter.rooms.get(userRoom(userId))?.size ?? 0
  }
}
