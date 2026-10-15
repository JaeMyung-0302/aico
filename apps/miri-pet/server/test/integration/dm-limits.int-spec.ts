import { randomUUID } from 'node:crypto'
import type { INestApplication } from '@nestjs/common'
import { DM_REQUEST_LIMIT_CODE, DM_REQUEST_DAILY_LIMIT } from '@miri-pet/shared'
import request from 'supertest'
import { PUSH_SENDER } from '../../src/notifications/push.service'
import { PrismaService } from '../../src/prisma/prisma.service'
import { orderPair } from '../../src/dm/dm-rules'
import { bearer, consentedLogin, withEnv } from './auth-helpers'
import { createUser } from './factories'
import { createTestApp } from './setup-app'
import { createFakePushSender } from './social-helpers'
import { truncateAll } from './truncate'

type Session = Awaited<ReturnType<typeof consentedLogin>>

const HOUR_MS = 3_600_000
const BASE = '/api/v1/dm/conversations'

// 보안 리뷰 MEDIUM-1: 메시지 요청 스팸. 하루 새 요청 상한 + 대화 생성 rate limit
describe('DM 요청 스팸 제한 (실DB)', () => {
  let app: INestApplication
  let prisma: PrismaService
  let restoreEnv: () => void
  let ipSeq = 0
  const push = createFakePushSender()

  beforeAll(async () => {
    // 전역 IP 제한(120/분)과 섞이지 않게 테스트마다 다른 클라이언트 IP로 보낸다
    restoreEnv = withEnv({ ENABLE_DEV_LOGIN: 'true', NODE_ENV: 'test', TRUST_PROXY_HOPS: '2' })
    app = await createTestApp((builder) => builder.overrideProvider(PUSH_SENDER).useValue(push.sender))
    prisma = app.get(PrismaService)
  })

  beforeEach(async () => {
    await truncateAll(prisma)
    ipSeq += 1
  })

  afterAll(async () => {
    await app.close()
    restoreEnv()
  })

  const ip = () => `198.51.100.${ipSeq}`
  const openConversation = (token: string, userId: string) =>
    request(app.getHttpServer())
      .post(BASE)
      .set(...bearer(token))
      .set('cf-connecting-ip', ip())
      .send({ userId })
  const sendMessage = (token: string, conversationId: string) =>
    request(app.getHttpServer())
      .post(`${BASE}/${conversationId}/messages`)
      .set(...bearer(token))
      .set('cf-connecting-ip', ip())
      .send({ clientMessageId: randomUUID(), body: '안녕하세요' })

  // sender가 첫 메시지를 보낸 대화를 DB에 바로 만든다(상대 상태·첫 메시지 시각 지정)
  const seedConversation = async (
    sender: Session,
    { peerState, firstMessageAt }: { peerState: 'REQUEST' | 'ACCEPTED'; firstMessageAt: Date },
  ) => {
    const peer = await createUser(prisma)
    await prisma.conversation.create({
      data: {
        ...orderPair(sender.userId, peer.id),
        lastMessageAt: firstMessageAt,
        members: {
          create: [
            { userId: sender.userId, state: 'ACCEPTED' },
            { userId: peer.id, state: peerState },
          ],
        },
        messages: {
          create: [{ senderId: sender.userId, clientMessageId: randomUUID(), body: '요청', createdAt: firstMessageAt }],
        },
      },
    })
  }

  it('상한은 하루 20건, 에러 코드 DM_REQUEST_LIMIT', () => {
    expect(DM_REQUEST_DAILY_LIMIT).toBe(20)
    expect(DM_REQUEST_LIMIT_CODE).toBe('DM_REQUEST_LIMIT')
  })

  it('24시간 안에 새 요청(상대 REQUEST + 첫 메시지)을 20건 보냈으면 21번째 새 요청의 첫 메시지는 429', async () => {
    const spammer = await consentedLogin(app, '요청왕')
    const now = new Date()
    for (let n = 0; n < DM_REQUEST_DAILY_LIMIT - 1; n += 1) {
      await seedConversation(spammer, { peerState: 'REQUEST', firstMessageAt: now })
    }
    // 집계 제외: 24시간 넘은 요청, 맞팔(상대 ACCEPTED) 대화
    await seedConversation(spammer, { peerState: 'REQUEST', firstMessageAt: new Date(Date.now() - 25 * HOUR_MS) })
    await seedConversation(spammer, { peerState: 'ACCEPTED', firstMessageAt: now })

    const twentieth = await createUser(prisma)
    const opened = await openConversation(spammer.accessToken, twentieth.id).expect(200)
    await sendMessage(spammer.accessToken, opened.body.id).expect(201)
    // 이미 시작한 요청 대화에 이어 보내는 것은 새 요청이 아니다
    await sendMessage(spammer.accessToken, opened.body.id).expect(201)

    const overLimit = await createUser(prisma)
    const blocked = await openConversation(spammer.accessToken, overLimit.id).expect(200)
    const res = await sendMessage(spammer.accessToken, blocked.body.id).expect(429)
    expect(res.body.code).toBe(DM_REQUEST_LIMIT_CODE)
    expect(await prisma.message.count({ where: { conversationId: blocked.body.id } })).toBe(0)
    expect(await prisma.notification.count({ where: { userId: overLimit.id } })).toBe(0)

    // 맞팔 상대(요청이 아님)에게는 계속 보낼 수 있다
    const friend = await consentedLogin(app, '맞팔친구')
    await request(app.getHttpServer())
      .put(`/api/v1/users/${friend.userId}/follow`)
      .set(...bearer(spammer.accessToken))
      .set('cf-connecting-ip', ip())
      .expect(200)
    await request(app.getHttpServer())
      .put(`/api/v1/users/${spammer.userId}/follow`)
      .set(...bearer(friend.accessToken))
      .set('cf-connecting-ip', ip())
      .expect(200)
    const mutual = await openConversation(spammer.accessToken, friend.userId).expect(200)
    await sendMessage(spammer.accessToken, mutual.body.id).expect(201)
  })

  it('POST /dm/conversations는 사용자당 1시간 30회(가드가 검증보다 먼저 센다), 다른 사용자는 별도', async () => {
    const first = await consentedLogin(app, '첫째')
    const second = await consentedLogin(app, '둘째')
    const statuses: number[] = []
    // 자기 자신에게 열기 = 400이지만 횟수에는 들어간다
    for (let n = 0; n < 30; n += 1) statuses.push((await openConversation(first.accessToken, first.userId)).status)
    expect(statuses.every((status) => status === 400)).toBe(true)
    expect((await openConversation(first.accessToken, first.userId)).status).toBe(429)
    expect((await openConversation(second.accessToken, second.userId)).status).toBe(400)
  })
})
