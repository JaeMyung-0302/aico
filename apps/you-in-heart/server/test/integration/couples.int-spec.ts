import type { INestApplication } from '@nestjs/common'
import { INVITE_CODE_ALPHABET, INVITE_CODE_LENGTH, INVITE_TTL_HOURS } from '@you-in-heart/shared'
import request from 'supertest'
import { PUSH_SENDER, type PushSender } from '../../src/notifications/push.service'
import { PrismaService } from '../../src/prisma/prisma.service'
import { bearer, tokenFor } from './auth-helpers'
import { createPairedCouple, createUser, grantRequiredConsents } from './factories'
import { createFakePush, type FakePush } from './fake-push'
import { createTestApp } from './setup-app'
import { truncateAll } from './truncate'

const INVITE_CODE_PATTERN = new RegExp(`^[${INVITE_CODE_ALPHABET}]{${INVITE_CODE_LENGTH}}$`)
const NOT_FOUND_MESSAGE = '코드를 확인해 주세요'
const HOUR_MS = 3_600_000

type Login = { userId: string; token: string }

const startApp = (sender: PushSender) =>
  createTestApp((builder) => builder.overrideProvider(PUSH_SENDER).useValue(sender))

// requestId는 요청마다 다르므로 빼고 비교한다
const withoutRequestId = (body: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(body).filter(([key]) => key !== 'requestId'))

describe('커플 페어링 (실DB)', () => {
  let app: INestApplication
  let prisma: PrismaService
  let push: FakePush

  const login = async (): Promise<Login> => {
    const user = await createUser(prisma)
    return { userId: user.id, token: await tokenFor(app, user.id) }
  }
  const createInvite = (who: Login) =>
    request(app.getHttpServer())
      .post('/api/v1/couples/invites')
      .set(...bearer(who.token))
  const join = (who: Login, code: string) =>
    request(app.getHttpServer())
      .post('/api/v1/couples/join')
      .set(...bearer(who.token))
      .send({ code })

  beforeAll(async () => {
    push = createFakePush()
    app = await startApp(push.sender)
    prisma = app.get(PrismaService)
  })

  beforeEach(async () => {
    await truncateAll(prisma)
    push.reset()
  })

  afterAll(async () => {
    await app.close()
  })

  describe('POST /couples/invites', () => {
    it('미소속 사용자는 6자 코드(공용 알파벳)와 24시간 만료를 받고 invite_created 이벤트가 남는다', async () => {
      const me = await login()
      const before = Date.now()
      const res = await createInvite(me).expect(201)
      expect(res.body.code).toMatch(INVITE_CODE_PATTERN)
      const expiresAt = new Date(res.body.expiresAt).getTime()
      expect(expiresAt).toBeGreaterThanOrEqual(before + INVITE_TTL_HOURS * HOUR_MS - 1_000)
      expect(expiresAt).toBeLessThanOrEqual(Date.now() + INVITE_TTL_HOURS * HOUR_MS + 1_000)
      const events = await prisma.eventLog.findMany({ where: { userId: me.userId } })
      expect(events.map((event) => [event.name, event.coupleId])).toEqual([['invite_created', null]])
    })

    it('이미 커플이면 409', async () => {
      const { members } = await createPairedCouple(prisma)
      const token = await tokenFor(app, members[0].id)
      await createInvite({ userId: members[0].id, token }).expect(409)
    })

    it('재발급하면 이전 코드는 무효(404)이고 새 코드로는 연결된다', async () => {
      const creator = await login()
      const joiner = await login()
      const first = await createInvite(creator).expect(201)
      const second = await createInvite(creator).expect(201)
      expect(second.body.code).not.toBe(first.body.code)
      await join(joiner, first.body.code).expect(404)
      await join(joiner, second.body.code).expect(201)
    })

    it('토큰 없이 호출하면 401', async () => {
      await request(app.getHttpServer()).post('/api/v1/couples/invites').expect(401)
    })
  })

  describe('POST /couples/join', () => {
    it('성공하면 ACTIVE 커플 + 멤버 2명(초대자 slot 1, 참여자 slot 2)과 couple_paired 이벤트', async () => {
      const creator = await login()
      const joiner = await login()
      const { body: invite } = await createInvite(creator).expect(201)
      const res = await join(joiner, invite.code.toLowerCase()).expect(201)

      expect(res.body).toMatchObject({ status: 'ACTIVE', startedOn: null, purgeAfter: null })
      const couple = await prisma.couple.findUniqueOrThrow({ where: { id: res.body.id }, include: { members: true } })
      expect(couple.status).toBe('ACTIVE')
      const slots = couple.members
        .map((member) => [member.userId, member.slot])
        .sort((a, b) => Number(a[1]) - Number(b[1]))
      expect(slots).toEqual([
        [creator.userId, 1],
        [joiner.userId, 2],
      ])
      expect((await prisma.coupleInvite.findUniqueOrThrow({ where: { code: invite.code } })).usedAt).not.toBeNull()
      expect(await prisma.eventLog.count({ where: { name: 'couple_paired', coupleId: couple.id } })).toBe(1)
    })

    it('만료·사용됨·자기 코드·이미 소속·존재하지 않음은 모두 같은 본문의 404', async () => {
      const creator = await login()
      const joiner = await login()
      const outsider = await login()
      const expiredOwner = await login()
      const { body: expired } = await createInvite(expiredOwner).expect(201)
      await prisma.coupleInvite.update({
        where: { code: expired.code },
        data: { expiresAt: new Date(Date.now() - 1_000) },
      })
      const { body: own } = await createInvite(outsider).expect(201)
      const { body: used } = await createInvite(creator).expect(201)
      await join(joiner, used.code).expect(201)
      const freshOwner = await login()
      const { body: fresh } = await createInvite(freshOwner).expect(201)
      const missing = [...INVITE_CODE_ALPHABET.slice(0, INVITE_CODE_LENGTH)].join('')

      const failures = await Promise.all([
        join(outsider, expired.code),
        join(outsider, used.code),
        join(outsider, own.code),
        join(joiner, fresh.code),
        join(outsider, missing === fresh.code ? 'ZZZZZZ' : missing),
      ])
      failures.forEach((res) => expect(res.status).toBe(404))
      const bodies = failures.map((res) => withoutRequestId(res.body))
      bodies.forEach((body) => expect(body).toEqual({ statusCode: 404, message: NOT_FOUND_MESSAGE }))
      expect(await prisma.couple.count()).toBe(1)
    })

    it('같은 코드에 두 사용자가 동시에 join하면 1명만 성공한다', async () => {
      const creator = await login()
      const [first, second] = await Promise.all([login(), login()])
      const { body: invite } = await createInvite(creator).expect(201)
      const results = await Promise.all([join(first, invite.code), join(second, invite.code)])
      expect(results.map((res) => res.status).sort()).toEqual([201, 404])
      expect(await prisma.couple.count()).toBe(1)
      expect(await prisma.coupleMember.count()).toBe(2)
    })

    it('형식이 틀린 코드는 400', async () => {
      const me = await login()
      await join(me, 'I0O1').expect(400)
    })
  })

  describe('PATCH /couples/me · GET /couples/me · GET /me', () => {
    it('두 멤버 모두 사귄 날을 바꿀 수 있고, 바꾸면 상대에게 푸시(본문에 날짜 없음)', async () => {
      const { couple, members } = await createPairedCouple(prisma, { startedOn: null })
      await grantRequiredConsents(
        prisma,
        members.map((member) => member.id),
      )
      const first: Login = { userId: members[0].id, token: await tokenFor(app, members[0].id) }
      const second: Login = { userId: members[1].id, token: await tokenFor(app, members[1].id) }
      await prisma.pushToken.create({
        data: { userId: second.userId, expoToken: 'ExponentPushToken[partner]', platform: 'IOS' },
      })

      const patch = (who: Login, startedOn: string) =>
        request(app.getHttpServer())
          .patch('/api/v1/couples/me')
          .set(...bearer(who.token))
          .send({ startedOn })
      expect((await patch(first, '2024-02-29').expect(200)).body.startedOn).toBe('2024-02-29')
      expect(push.sent()).toHaveLength(1)
      expect(push.sent()[0]?.to).toBe('ExponentPushToken[partner]')
      expect(`${push.sent()[0]?.title} ${push.sent()[0]?.body}`).not.toContain('2024')
      expect((await patch(second, '2024-03-01').expect(200)).body.startedOn).toBe('2024-03-01')

      const got = await request(app.getHttpServer())
        .get('/api/v1/couples/me')
        .set(...bearer(first.token))
        .expect(200)
      expect(got.body).toMatchObject({ id: couple.id, status: 'ACTIVE', startedOn: '2024-03-01' })
      expect(got.body.members.map((member: { slot: number }) => member.slot)).toEqual([1, 2])

      const me = await request(app.getHttpServer())
        .get('/api/v1/me')
        .set(...bearer(second.token))
        .expect(200)
      expect(me.body.couple).toEqual({ id: couple.id, status: 'ACTIVE', startedOn: '2024-03-01', purgeAfter: null })
    })

    it('사귄 날을 바꾸면 상대 멤버에게만 푸시 1건(data는 type만) + 수신자 기준 notification_sent 1건', async () => {
      const { couple, members } = await createPairedCouple(prisma, { startedOn: null })
      await grantRequiredConsents(
        prisma,
        members.map((member) => member.id),
      )
      await prisma.pushToken.createMany({
        data: [
          { userId: members[0].id, expoToken: 'ExponentPushToken[actor]', platform: 'IOS' },
          { userId: members[1].id, expoToken: 'ExponentPushToken[partner]', platform: 'ANDROID' },
        ],
      })
      await request(app.getHttpServer())
        .patch('/api/v1/couples/me')
        .set(...bearer(await tokenFor(app, members[0].id)))
        .send({ startedOn: '2024-05-05' })
        .expect(200)

      expect(push.sent().map((message) => [message.to, message.data])).toEqual([
        ['ExponentPushToken[partner]', { type: 'STARTED_ON_CHANGED' }],
      ])
      const events = await prisma.eventLog.findMany({ where: { name: 'notification_sent' } })
      expect(events.map((event) => [event.coupleId, event.userId, event.props])).toEqual([
        [couple.id, members[1].id, { kind: 'STARTED_ON_CHANGED' }],
      ])
    })

    it('잘못된 날짜는 400', async () => {
      const { members } = await createPairedCouple(prisma)
      await grantRequiredConsents(prisma, [members[0].id])
      const token = await tokenFor(app, members[0].id)
      await request(app.getHttpServer())
        .patch('/api/v1/couples/me')
        .set(...bearer(token))
        .send({ startedOn: '2025-02-30' })
        .expect(400)
    })
  })
})

// throttle 저장소는 앱마다 따로라 시도 제한은 앱을 새로 띄워 검사한다
describe('POST /couples/join 시도 제한 (실DB)', () => {
  let app: INestApplication
  let prisma: PrismaService

  beforeEach(async () => {
    app = await startApp(createFakePush().sender)
    prisma = app.get(PrismaService)
    await truncateAll(prisma)
  })

  afterEach(async () => {
    await app.close()
  })

  const joinAs = (token: string) =>
    request(app.getHttpServer())
      .post('/api/v1/couples/join')
      .set(...bearer(token))
      .send({ code: 'ZZZZZZ' })

  it('사용자당 10분에 5회: 6번째는 429', async () => {
    const user = await createUser(prisma)
    const token = await tokenFor(app, user.id)
    const statuses = await [1, 2, 3, 4, 5, 6].reduce<Promise<number[]>>(
      async (acc) => [...(await acc), (await joinAs(token)).status],
      Promise.resolve([]),
    )
    expect(statuses).toEqual([404, 404, 404, 404, 404, 429])
  })

  it('IP당 1시간에 20회: 사용자가 달라도 21번째는 429', async () => {
    const users = await Promise.all([1, 2, 3, 4, 5].map(() => createUser(prisma)))
    const tokens = await Promise.all(users.map((user) => tokenFor(app, user.id)))
    const attempts = tokens.flatMap((token) => [token, token, token, token])
    const statuses = await attempts.reduce<Promise<number[]>>(
      async (acc, token) => [...(await acc), (await joinAs(token)).status],
      Promise.resolve([]),
    )
    expect(statuses.every((status) => status === 404)).toBe(true)
    const extra = await createUser(prisma)
    expect((await joinAs(await tokenFor(app, extra.id))).status).toBe(429)
  })
})
