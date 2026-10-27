import type { INestApplication } from '@nestjs/common'
import { computeAnniversaries } from '@you-in-heart/shared'
import request from 'supertest'
import { AnniversaryReminderService } from '../../src/anniversaries/anniversary-reminder.service'
import { PUSH_SENDER } from '../../src/notifications/push.service'
import { PrismaService } from '../../src/prisma/prisma.service'
import { MemoryObjectStorage } from '../../src/storage/memory-object-storage'
import { OBJECT_STORAGE } from '../../src/storage/object-storage'
import { bearer } from './auth-helpers'
import { createCoupleSession, type CoupleSession } from './couple-session'
import { createFakePush, type FakePush } from './fake-push'
import { createTestApp } from './setup-app'
import { truncateAll } from './truncate'

const API = '/api/v1/anniversaries'
const STARTED_ON = '2025-03-01'
// 2025-06-08 = 100일(사귄 날 + 99일). 그 3일 전 09:00 KST
const THREE_DAYS_BEFORE_100 = new Date('2025-06-05T00:00:00Z')

describe('기념일 (실DB)', () => {
  let app: INestApplication
  let prisma: PrismaService
  let push: FakePush

  const http = () => request(app.getHttpServer())
  const newCouple = (overrides: Parameters<typeof createCoupleSession>[2] = {}) =>
    createCoupleSession(app, prisma, { startedOn: new Date(STARTED_ON), ...overrides })
  const addCustom = (session: CoupleSession, who: 0 | 1, body: object) =>
    http()
      .post(API)
      .set(...bearer(session.tokens[who]))
      .send(body)
  const registerTokens = (session: CoupleSession) =>
    prisma.pushToken.createMany({
      data: session.members.map((member, index) => ({
        userId: member.id,
        expoToken: `ExponentPushToken[${session.couple.id}-${index}]`,
        platform: 'IOS' as const,
      })),
    })

  beforeAll(async () => {
    push = createFakePush()
    app = await createTestApp((builder) =>
      builder
        .overrideProvider(PUSH_SENDER)
        .useValue(push.sender)
        .overrideProvider(OBJECT_STORAGE)
        .useValue(new MemoryObjectStorage()),
    )
    prisma = app.get(PrismaService)
  })

  beforeEach(async () => {
    await truncateAll(prisma)
    push.reset()
  })

  afterAll(async () => {
    await app.close()
  })

  describe('GET /anniversaries?from&to', () => {
    it('자동(100일 단위·N주년)과 커스텀을 날짜순으로 합쳐 shared computeAnniversaries와 같게 돌려준다', async () => {
      const session = await newCouple()
      const { body: custom } = await addCustom(session, 0, { title: '첫 여행', date: '2025-05-05' }).expect(201)
      const res = await http()
        .get(`${API}?from=2025-05-01&to=2026-05-31`)
        .set(...bearer(session.tokens[1]))
        .expect(200)

      const expected = computeAnniversaries({
        startedOn: STARTED_ON,
        customs: [{ id: custom.id, title: '첫 여행', date: '2025-05-05' }],
        today: '2025-05-01',
        horizonDays: 395,
      })
      expect(res.body.items).toEqual(expected)
      expect(res.body.items.map((item: { kind: string }) => item.kind)).toEqual(
        expect.arrayContaining(['HUNDRED_DAYS', 'YEARLY', 'CUSTOM']),
      )
      const dates = res.body.items.map((item: { date: string }) => item.date)
      expect(dates).toEqual([...dates].sort())
    })

    it('사귄 날이 없으면 커스텀만', async () => {
      const session = await newCouple({ startedOn: null })
      await addCustom(session, 0, { title: '첫 만남', date: '2024-12-24' }).expect(201)
      const res = await http()
        .get(`${API}?from=2025-01-01&to=2025-12-31`)
        .set(...bearer(session.tokens[0]))
        .expect(200)
      expect(res.body.items).toEqual([expect.objectContaining({ kind: 'CUSTOM', date: '2025-12-24' })])
    })

    it.each([
      ['from > to', '?from=2025-02-01&to=2025-01-01'],
      ['파라미터 없음', ''],
      ['잘못된 날짜', '?from=2025-02-30&to=2025-03-01'],
      ['범위 10년 초과', '?from=2025-01-01&to=2036-01-02'],
    ])('%s → 400', async (_label, query) => {
      const session = await newCouple()
      await http()
        .get(`${API}${query}`)
        .set(...bearer(session.tokens[0]))
        .expect(400)
    })
  })

  describe('커스텀 기념일 CRUD', () => {
    it('두 멤버 모두 추가·수정·삭제할 수 있고, 작성자는 요청한 멤버로 기록된다', async () => {
      const session = await newCouple()
      const created = await addCustom(session, 0, { title: ' 첫 여행 ', date: '2025-05-05' }).expect(201)
      expect(created.body).toEqual({ id: expect.any(String), title: '첫 여행', date: '2025-05-05' })
      const row = await prisma.anniversary.findFirstOrThrow({ where: { id: created.body.id } })
      expect(row.createdById).toBe(session.members[0].id)
      expect(row.coupleId).toBe(session.couple.id)

      const patched = await http()
        .patch(`${API}/${created.body.id}`)
        .set(...bearer(session.tokens[1]))
        .send({ date: '2025-05-06' })
        .expect(200)
      expect(patched.body).toEqual({ id: created.body.id, title: '첫 여행', date: '2025-05-06' })

      const list = await http()
        .get(`${API}/custom`)
        .set(...bearer(session.tokens[0]))
        .expect(200)
      expect(list.body).toEqual({ items: [{ id: created.body.id, title: '첫 여행', date: '2025-05-06' }] })

      await http()
        .delete(`${API}/${created.body.id}`)
        .set(...bearer(session.tokens[1]))
        .expect(204)
      expect(await prisma.anniversary.count({ where: { coupleId: session.couple.id } })).toBe(0)
    })

    it.each([
      ['제목 없음', { date: '2025-05-05' }],
      ['제목 31자', { title: '가'.repeat(31), date: '2025-05-05' }],
      ['공백만 있는 제목', { title: '   ', date: '2025-05-05' }],
      ['날짜 없음', { title: '첫 여행' }],
    ])('%s → 400', async (_label, body) => {
      const session = await newCouple()
      await addCustom(session, 0, body).expect(400)
    })

    it('자동 기념일 id로 PATCH·DELETE하면 400', async () => {
      const session = await newCouple()
      await http()
        .patch(`${API}/auto:100d:100`)
        .set(...bearer(session.tokens[0]))
        .send({ title: '백일' })
        .expect(400)
      await http()
        .delete(`${API}/auto:year:1`)
        .set(...bearer(session.tokens[0]))
        .expect(400)
    })

    it('빈 본문 PATCH({})는 바꾸지 않고 현재 값(200), 다른 커플 id는 404', async () => {
      const session = await newCouple()
      const other = await newCouple()
      const { body: created } = await addCustom(session, 0, { title: '첫 여행', date: '2025-05-05' }).expect(201)
      const patchEmpty = (token: string) =>
        http()
          .patch(`${API}/${created.id}`)
          .set(...bearer(token))
          .send({})
      expect((await patchEmpty(session.tokens[1]).expect(200)).body).toEqual(created)
      await patchEmpty(other.tokens[0]).expect(404)
    })

    it('다른 커플의 커스텀 id는 PATCH·DELETE 모두 404이고 그 커플 행은 그대로', async () => {
      const mine = await newCouple()
      const theirs = await newCouple()
      const { body: their } = await addCustom(theirs, 0, { title: '그들의 날', date: '2025-07-07' }).expect(201)
      await http()
        .patch(`${API}/${their.id}`)
        .set(...bearer(mine.tokens[0]))
        .send({ title: '탈취' })
        .expect(404)
      await http()
        .delete(`${API}/${their.id}`)
        .set(...bearer(mine.tokens[0]))
        .expect(404)
      const row = await prisma.anniversary.findFirstOrThrow({ where: { id: their.id } })
      expect(row.title).toBe('그들의 날')
    })

    it('연결 해제 유예(UNLINKING) 중에는 조회만 되고 추가는 409', async () => {
      const session = await newCouple({ status: 'UNLINKING', purgeAfter: new Date(Date.now() + 86_400_000) })
      await http()
        .get(`${API}?from=2025-01-01&to=2025-12-31`)
        .set(...bearer(session.tokens[0]))
        .expect(200)
      await addCustom(session, 0, { title: '첫 여행', date: '2025-05-05' }).expect(409)
    })
  })

  describe('기념일 푸시 (AnniversaryReminderService, 실DB 유니크)', () => {
    it('D-3 대상 커플 멤버 2명에게 1건씩, 같은 날 다시 실행하면 추가 0건, UNLINKING 커플은 제외', async () => {
      const target = await newCouple()
      const unlinking = await newCouple({ status: 'UNLINKING', purgeAfter: new Date('2025-07-01T00:00:00Z') })
      await registerTokens(target)
      await registerTokens(unlinking)
      const reminders = app.get(AnniversaryReminderService)

      await reminders.runOnce(THREE_DAYS_BEFORE_100)
      expect(push.sent().map((message) => message.to)).toEqual(
        expect.arrayContaining(target.members.map((_, index) => `ExponentPushToken[${target.couple.id}-${index}]`)),
      )
      expect(push.sent()).toHaveLength(2)
      expect(push.sent().every((message) => !`${message.title} ${message.body}`.includes('2025'))).toBe(true)
      const logs = await prisma.notificationLog.findMany({ where: { coupleId: target.couple.id } })
      expect(logs.map((log) => [log.kind, log.dueOn.toISOString().slice(0, 10)])).toEqual([
        ['ANNIVERSARY_D3', '2025-06-05'],
        ['ANNIVERSARY_D3', '2025-06-05'],
      ])
      const events = await prisma.eventLog.findMany({ where: { name: 'notification_sent' } })
      expect(events.map((event) => event.coupleId)).toEqual([target.couple.id, target.couple.id])

      await reminders.runOnce(new Date('2025-06-05T05:00:00Z'))
      expect(push.sent()).toHaveLength(2)
      expect(await prisma.notificationLog.count()).toBe(2)
      expect(await prisma.eventLog.count({ where: { name: 'notification_sent' } })).toBe(2)
    })
  })
})
