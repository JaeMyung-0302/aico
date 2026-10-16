import type { INestApplication } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { DM_SOCKET_ERRORS, DM_SOCKET_EVENTS } from '@miri-pet/shared'
import request from 'supertest'
import { DM_PUSH_BODY } from '../../src/dm/dm-rules'
import { DM_SOCKET_LIMITS, type DmSocketLimits } from '../../src/dm/socket-limits'
import { UserSuspensionService } from '../../src/moderation/user-suspension.service'
import { PUSH_SENDER } from '../../src/notifications/push.service'
import { PrismaService } from '../../src/prisma/prisma.service'
import { bearer, consentedLogin, devLogin, withEnv } from './auth-helpers'
import { dmApi } from './dm-helpers'
import { createTestApp } from './setup-app'
import { createFakePushSender } from './social-helpers'
import {
  type ClientSocket,
  collectEvents,
  connectSocket,
  waitForConnection,
  waitForConnectionDetail,
  waitForDisconnect,
  waitUntil,
} from './socket-client'
import { truncateAll } from './truncate'

type Session = Awaited<ReturnType<typeof consentedLogin>>

const DELIVERY_BUDGET_MS = 1000
const SILENCE_WINDOW_MS = 300
const DISCONNECT_BUDGET_MS = 1500
// 이 파일의 다른 테스트가 같은 IP(127.0.0.1)로 여러 번 연결하므로 IP 제한은 별도 describe에서 낮춰 검증한다
const RELAXED_LIMITS: DmSocketLimits = { maxSocketsPerUser: 5, handshakesPerIp: 1000, handshakeWindowMs: 60_000 }

describe('DM socket.io gateway (실DB + 실제 소켓)', () => {
  let app: INestApplication
  let prisma: PrismaService
  let restoreEnv: () => void
  let baseUrl: string
  let dm: ReturnType<typeof dmApi>
  let sockets: ClientSocket[] = []
  const push = createFakePushSender()

  beforeAll(async () => {
    restoreEnv = withEnv({ ENABLE_DEV_LOGIN: 'true', NODE_ENV: 'test' })
    app = await createTestApp((builder) =>
      builder
        .overrideProvider(PUSH_SENDER)
        .useValue(push.sender)
        .overrideProvider(DM_SOCKET_LIMITS)
        .useValue(RELAXED_LIMITS),
    )
    await app.listen(0, '127.0.0.1')
    baseUrl = await app.getUrl()
    prisma = app.get(PrismaService)
    dm = dmApi(app)
  })

  beforeEach(async () => {
    await truncateAll(prisma)
    push.reset()
  })

  afterEach(() => {
    sockets.forEach((socket) => socket.disconnect())
    sockets = []
  })

  afterAll(async () => {
    await app.close()
    restoreEnv()
  })

  const connect = async (token?: string) => {
    const socket = connectSocket(baseUrl, token)
    sockets = [...sockets, socket]
    return { socket, result: await waitForConnection(socket) }
  }
  const login = async (nickname: string): Promise<Session> => {
    const session = await consentedLogin(app, nickname)
    await prisma.pushToken.create({
      data: { userId: session.userId, expoToken: `ExponentPushToken[${nickname}]`, platform: 'ANDROID' },
    })
    return session
  }
  const mutualConversation = async (a: Session, b: Session): Promise<string> => {
    await dm.follow(a.accessToken, b.userId).expect(200)
    await dm.follow(b.accessToken, a.userId).expect(200)
    push.reset()
    const res = await dm.open(a.accessToken, b.userId).expect(200)
    return res.body.id
  }

  it('토큰 없음·잘못된 토큰·정지·동의 전 사용자의 handshake를 거부한다', async () => {
    expect((await connect()).result).toBe('rejected')
    expect((await connect('not-a-jwt')).result).toBe('rejected')
    const suspended = await login('정지')
    await prisma.user.update({ where: { id: suspended.userId }, data: { status: 'SUSPENDED' } })
    expect((await connect(suspended.accessToken)).result).toBe('rejected')
    const noConsent = await devLogin(app, '미동의')
    expect((await connect(noConsent.accessToken)).result).toBe('rejected')
    const ok = await login('정상')
    expect((await connect(ok.accessToken)).result).toBe('connected')
  })

  it('A→B 전송: 1초 안에 B 소켓만 message:new를 받고, 온라인인 B에게는 푸시를 보내지 않는다', async () => {
    const a = await login('에이')
    const b = await login('비이')
    const c = await login('씨이')
    const conversationId = await mutualConversation(a, b)
    const socketA = await connect(a.accessToken)
    const socketB = await connect(b.accessToken)
    const socketC = await connect(c.accessToken)
    const receivedA = collectEvents(socketA.socket, DM_SOCKET_EVENTS.messageNew)
    const receivedB = collectEvents(socketB.socket, DM_SOCKET_EVENTS.messageNew)
    const receivedC = collectEvents(socketC.socket, DM_SOCKET_EVENTS.messageNew)

    const startedAt = Date.now()
    const sent = await dm.send(a.accessToken, conversationId, { body: '실시간이에요' }).expect(201)
    expect(await waitUntil(() => receivedB().length === 1, DELIVERY_BUDGET_MS)).toBe(true)
    expect(Date.now() - startedAt).toBeLessThan(DELIVERY_BUDGET_MS)
    expect(receivedB()[0]).toMatchObject({ id: sent.body.id, conversationId, senderId: a.userId, body: '실시간이에요' })
    await new Promise((tick) => setTimeout(tick, SILENCE_WINDOW_MS))
    expect(receivedC()).toEqual([])
    expect(receivedA()).toEqual([])
    expect(push.sent()).toEqual([])
  })

  it('읽음: B가 읽으면 A 소켓이 message:read를 받는다', async () => {
    const a = await login('에이')
    const b = await login('비이')
    const conversationId = await mutualConversation(a, b)
    const socketA = await connect(a.accessToken)
    const reads = collectEvents(socketA.socket, DM_SOCKET_EVENTS.messageRead)
    const sent = await dm.send(a.accessToken, conversationId).expect(201)
    await dm.read(b.accessToken, conversationId, sent.body.id).expect(204)
    expect(await waitUntil(() => reads().length === 1, DELIVERY_BUDGET_MS)).toBe(true)
    expect(reads()[0]).toEqual({ conversationId, userId: b.userId, lastReadMessageId: sent.body.id })
  })

  it('B가 끊겨 있으면 Expo 푸시, 재연결 후 마지막으로 본 id 이후를 REST로 다시 받는다', async () => {
    const a = await login('에이')
    const b = await login('비이')
    const conversationId = await mutualConversation(a, b)
    const first = await connect(b.accessToken)
    const received = collectEvents(first.socket, DM_SOCKET_EVENTS.messageNew)
    const seen = await dm.send(a.accessToken, conversationId, { body: '받은 메시지' }).expect(201)
    expect(await waitUntil(() => received().length === 1, DELIVERY_BUDGET_MS)).toBe(true)
    first.socket.disconnect()
    // 서버가 연결 종료를 처리할 시간을 준다
    await new Promise((tick) => setTimeout(tick, 100))

    await dm.send(a.accessToken, conversationId, { body: '놓친 1' }).expect(201)
    await dm.send(a.accessToken, conversationId, { body: '놓친 2' }).expect(201)
    // LOW-6: 잠금 화면에 내용이 보이지 않게 미리보기 없이 고정 문구
    expect(push.sent().map((message) => message.body)).toEqual([DM_PUSH_BODY, DM_PUSH_BODY])

    expect((await connect(b.accessToken)).result).toBe('connected')
    const missed = await dm.messages(b.accessToken, conversationId, `?after=${seen.body.id}`).expect(200)
    expect(missed.body.items.map((m: { body: string }) => m.body)).toEqual(['놓친 1', '놓친 2'])
  })
  describe('보안 리뷰 LOW-1: 오래된 소켓 끊기', () => {
    it('로그아웃(세션 폐기)하면 열린 소켓이 서버에서 끊긴다', async () => {
      const a = await login('에이')
      const { socket } = await connect(a.accessToken)
      const disconnected = waitForDisconnect(socket, DISCONNECT_BUDGET_MS)
      await request(app.getHttpServer()).post('/api/v1/auth/logout').send({ refreshToken: a.refreshToken }).expect(204)
      expect(await disconnected).toBe('io server disconnect')
    })

    it('이용 정지하면 끊기고, 다시 연결할 수 없다', async () => {
      const a = await login('에이')
      const b = await login('비이')
      const socketA = await connect(a.accessToken)
      const socketB = await connect(b.accessToken)
      const disconnectedA = waitForDisconnect(socketA.socket, DISCONNECT_BUDGET_MS)
      const disconnectedB = waitForDisconnect(socketB.socket, SILENCE_WINDOW_MS)
      await app.get(UserSuspensionService).suspend(a.userId)
      expect(await disconnectedA).toBe('io server disconnect')
      // 다른 사용자의 소켓은 그대로
      expect(await disconnectedB).toBeNull()
      expect((await connect(a.accessToken)).result).toBe('rejected')
    })

    it('탈퇴하면 끊긴다', async () => {
      const a = await login('에이')
      const { socket } = await connect(a.accessToken)
      const disconnected = waitForDisconnect(socket, DISCONNECT_BUDGET_MS)
      await request(app.getHttpServer())
        .delete('/api/v1/me')
        .set(...bearer(a.accessToken))
        .expect(204)
      expect(await disconnected).toBe('io server disconnect')
    })

    it('access token 만료 시각(exp)에 서버가 소켓을 끊는다', async () => {
      const a = await login('에이')
      const shortLived = await app.get(JwtService).signAsync({ sub: a.userId, role: 'USER' }, { expiresIn: 2 })
      const { socket, result } = await connect(shortLived)
      expect(result).toBe('connected')
      expect(await waitForDisconnect(socket, 3500)).toBe('io server disconnect')
    })
  })

  describe('보안 리뷰 LOW-2: 사용자당 소켓 상한', () => {
    it('같은 사용자의 6번째 소켓은 TOO_MANY_CONNECTIONS로 거부, 하나가 닫히면 다시 받는다', async () => {
      const a = await login('에이')
      const b = await login('비이')
      const opened = await Promise.all([1, 2, 3, 4, 5].map(() => connect(a.accessToken)))
      expect(opened.map((entry) => entry.result)).toEqual(Array(5).fill('connected'))

      const sixth = connectSocket(baseUrl, a.accessToken)
      sockets = [...sockets, sixth]
      expect(await waitForConnectionDetail(sixth)).toEqual({
        result: 'rejected',
        error: DM_SOCKET_ERRORS.tooManyConnections,
      })
      // 다른 사용자는 영향 없음
      expect((await connect(b.accessToken)).result).toBe('connected')

      opened[0]?.socket.disconnect()
      // 서버가 연결 종료를 처리할 시간을 준다
      await new Promise((tick) => setTimeout(tick, 100))
      expect((await connect(a.accessToken)).result).toBe('connected')
    })
  })
})

describe('DM socket.io handshake IP 제한(보안 리뷰 LOW-2)', () => {
  let app: INestApplication
  let prisma: PrismaService
  let restoreEnv: () => void
  let baseUrl: string
  let sockets: ClientSocket[] = []
  const limits: DmSocketLimits = { maxSocketsPerUser: 5, handshakesPerIp: 3, handshakeWindowMs: 60_000 }

  beforeAll(async () => {
    // 프록시 뒤 설정 → REST rate limit과 같이 cf-connecting-ip를 클라이언트 IP로 본다
    restoreEnv = withEnv({ ENABLE_DEV_LOGIN: 'true', NODE_ENV: 'test', TRUST_PROXY_HOPS: '2' })
    app = await createTestApp((builder) => builder.overrideProvider(DM_SOCKET_LIMITS).useValue(limits))
    await app.listen(0, '127.0.0.1')
    baseUrl = await app.getUrl()
    prisma = app.get(PrismaService)
    await truncateAll(prisma)
  })

  afterEach(() => {
    sockets.forEach((socket) => socket.disconnect())
    sockets = []
  })

  afterAll(async () => {
    await app.close()
    restoreEnv()
  })

  const connectFrom = async (ip: string, token?: string) => {
    const socket = connectSocket(baseUrl, token, { 'cf-connecting-ip': ip })
    sockets = [...sockets, socket]
    return waitForConnectionDetail(socket)
  }

  it('같은 IP의 handshake는 창(1분) 안에서 limit번까지(거부된 시도도 센다), 다른 IP는 별도', async () => {
    const a = await consentedLogin(app, '아이피')
    expect(await connectFrom('203.0.113.50')).toEqual({ result: 'rejected', error: DM_SOCKET_ERRORS.unauthorized })
    expect((await connectFrom('203.0.113.50', a.accessToken)).result).toBe('connected')
    expect((await connectFrom('203.0.113.50', a.accessToken)).result).toBe('connected')
    expect(await connectFrom('203.0.113.50', a.accessToken)).toEqual({
      result: 'rejected',
      error: DM_SOCKET_ERRORS.rateLimited,
    })
    expect((await connectFrom('203.0.113.51', a.accessToken)).result).toBe('connected')
  })
})
