import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { PUSH_SENDER } from '../../src/notifications/push.service'
import { PrismaService } from '../../src/prisma/prisma.service'
import { MemoryObjectStorage } from '../../src/storage/memory-object-storage'
import { OBJECT_STORAGE } from '../../src/storage/object-storage'
import { bearer } from './auth-helpers'
import { createCoupleSession, type CoupleSession } from './couple-session'
import { createEntry, createPhoto } from './factories'
import { createFakePush, type FakePush } from './fake-push'
import { createTestApp } from './setup-app'
import { truncateAll } from './truncate'

const API = '/api/v1/diary'

type EntryBody = { id: string; happenedOn: string; kind: string }

describe('일기 (실DB)', () => {
  let app: INestApplication
  let prisma: PrismaService
  let storage: MemoryObjectStorage
  let push: FakePush

  const http = () => request(app.getHttpServer())
  const newCouple = (overrides: Parameters<typeof createCoupleSession>[2] = {}) =>
    createCoupleSession(app, prisma, overrides)
  const post = (session: CoupleSession, who: 0 | 1, body: object) =>
    http()
      .post(API)
      .set(...bearer(session.tokens[who]))
      .send(body)
  const list = (session: CoupleSession, query = '') =>
    http()
      .get(`${API}${query}`)
      .set(...bearer(session.tokens[0]))

  beforeAll(async () => {
    storage = new MemoryObjectStorage()
    push = createFakePush()
    app = await createTestApp((builder) =>
      builder.overrideProvider(PUSH_SENDER).useValue(push.sender).overrideProvider(OBJECT_STORAGE).useValue(storage),
    )
    prisma = app.get(PrismaService)
  })

  beforeEach(async () => {
    await truncateAll(prisma)
    storage.clear()
    push.reset()
  })

  afterAll(async () => {
    await app.close()
  })

  describe('POST /diary', () => {
    it('작성자는 요청한 멤버, 응답은 DiaryEntry 모양, memory_created(type=diary) 1건', async () => {
      const session = await newCouple()
      const res = await post(session, 0, { happenedOn: '2026-10-01', title: ' 성수 ', body: '산책했다' }).expect(201)
      expect(res.body).toEqual({
        id: expect.any(String),
        kind: 'MANUAL',
        authorId: session.members[0].id,
        happenedOn: '2026-10-01',
        title: '성수',
        body: '산책했다',
        placeId: null,
        photos: [],
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      })
      const row = await prisma.diaryEntry.findFirstOrThrow({ where: { id: res.body.id } })
      expect([row.coupleId, row.authorId]).toEqual([session.couple.id, session.members[0].id])
      const events = await prisma.eventLog.findMany({ where: { name: 'memory_created' } })
      expect(events.map((event) => [event.coupleId, event.userId, event.props])).toEqual([
        [session.couple.id, session.members[0].id, { type: 'diary' }],
      ])
    })

    it.each([
      ['본문 5,001자', { happenedOn: '2026-10-01', body: '가'.repeat(5001) }],
      ['날짜 없음', { body: '오늘' }],
      ['잘못된 날짜', { happenedOn: '2026-02-30', body: '오늘' }],
      ['제목 61자', { happenedOn: '2026-10-01', title: '가'.repeat(61), body: '' }],
    ])('%s → 400', async (_label, body) => {
      const session = await newCouple()
      await post(session, 0, body).expect(400)
    })

    it('본문 0자·5,000자는 허용', async () => {
      const session = await newCouple()
      await post(session, 0, { happenedOn: '2026-10-01', body: '' }).expect(201)
      await post(session, 0, { happenedOn: '2026-10-01', body: '가'.repeat(5000) }).expect(201)
    })

    it('연결 해제 유예 중에는 409, 조회는 200', async () => {
      const session = await newCouple({ status: 'UNLINKING', purgeAfter: new Date(Date.now() + 86_400_000) })
      await post(session, 0, { happenedOn: '2026-10-01', body: '' }).expect(409)
      await list(session).expect(200)
    })
  })

  describe('상대 새 기록 푸시 (PARTNER_ENTRY, 1시간 1회)', () => {
    // KST 시간 버킷 'YYYY-MM-DDTHH'
    const kstHourBucket = (now: Date) => new Date(now.getTime() + 9 * 3_600_000).toISOString().slice(0, 13)

    it('일기를 쓰면 상대 멤버에게만 푸시 1건(본문·날짜 없음, data는 type·entryId), 같은 시간에 또 쓰면 0건', async () => {
      const session = await newCouple()
      await prisma.pushToken.createMany({
        data: [
          { userId: session.members[0].id, expoToken: 'ExponentPushToken[author]', platform: 'IOS' },
          { userId: session.members[1].id, expoToken: 'ExponentPushToken[partner]', platform: 'ANDROID' },
        ],
      })
      const first = await post(session, 0, { happenedOn: '2026-10-01', title: '성수', body: '비밀 이야기' }).expect(201)
      await post(session, 0, { happenedOn: '2026-10-02', body: '두 번째' }).expect(201)

      expect(push.sent().map((message) => [message.to, message.data])).toEqual([
        ['ExponentPushToken[partner]', { type: 'PARTNER_ENTRY', entryId: first.body.id }],
      ])
      const text = `${push.sent()[0]?.title} ${push.sent()[0]?.body}`
      expect(text).not.toMatch(/비밀|성수|2026|10월/)
      const logs = await prisma.notificationLog.findMany({ where: { coupleId: session.couple.id } })
      expect(logs.map((log) => [log.kind, log.refKey])).toEqual([
        ['PARTNER_ENTRY', `${session.members[0].id}:${kstHourBucket(new Date())}`],
      ])
      expect(await prisma.eventLog.count({ where: { name: 'notification_sent', userId: session.members[1].id } })).toBe(
        1,
      )
    })

    it('다음 시간 버킷이면(로그가 없으면) 다시 보내고, 상대가 쓰면 나에게 보낸다', async () => {
      const session = await newCouple()
      await prisma.pushToken.createMany({
        data: [
          { userId: session.members[0].id, expoToken: 'ExponentPushToken[a]', platform: 'IOS' },
          { userId: session.members[1].id, expoToken: 'ExponentPushToken[b]', platform: 'IOS' },
        ],
      })
      await post(session, 0, { happenedOn: '2026-10-01', body: '' }).expect(201)
      await prisma.notificationLog.deleteMany({ where: { coupleId: session.couple.id } })
      await post(session, 0, { happenedOn: '2026-10-01', body: '' }).expect(201)
      await post(session, 1, { happenedOn: '2026-10-01', body: '' }).expect(201)
      expect(push.sent().map((message) => message.to)).toEqual([
        'ExponentPushToken[b]',
        'ExponentPushToken[b]',
        'ExponentPushToken[a]',
      ])
    })
  })

  describe('GET /diary', () => {
    it('happenedOn desc, id desc로 20건씩, nextCursor로 이어 받고 마지막 페이지는 null', async () => {
      const session = await newCouple()
      const days = Array.from({ length: 13 }, (_, index) => `2026-09-${String(index + 10).padStart(2, '0')}`)
      // 같은 날짜 2건씩 → id desc 동률 해소 확인
      for (const day of [...days, ...days])
        await createEntry(prisma, session.couple.id, session.members[0].id, { happenedOn: new Date(day) })

      const first = await list(session).expect(200)
      expect(first.body.items).toHaveLength(20)
      expect(first.body.nextCursor).toBe(first.body.items[19].id)
      const second = await list(session, `?cursor=${first.body.nextCursor}`).expect(200)
      expect(second.body.items).toHaveLength(6)
      expect(second.body.nextCursor).toBeNull()

      const all: EntryBody[] = [...first.body.items, ...second.body.items]
      const expected = [...all].sort((a, b) => b.happenedOn.localeCompare(a.happenedOn) || b.id.localeCompare(a.id))
      expect(all.map((entry) => entry.id)).toEqual(expected.map((entry) => entry.id))
      expect(new Set(all.map((entry) => entry.id)).size).toBe(26)
    })

    it('before=YYYY-MM-DD는 그 날짜보다 이전 일기만(월 점프), limit 적용', async () => {
      const session = await newCouple()
      for (const day of ['2026-08-31', '2026-09-01', '2026-09-15', '2026-10-01']) {
        await createEntry(prisma, session.couple.id, session.members[0].id, { happenedOn: new Date(day) })
      }
      const res = await list(session, '?before=2026-09-15&limit=1').expect(200)
      expect(res.body.items.map((entry: EntryBody) => entry.happenedOn)).toEqual(['2026-09-01'])
      const next = await list(session, `?before=2026-09-15&cursor=${res.body.nextCursor}`).expect(200)
      expect(next.body.items.map((entry: EntryBody) => entry.happenedOn)).toEqual(['2026-08-31'])
    })

    it('다른 커플의 일기 id를 cursor로 쓰면 400이고 다른 커플 일기는 보이지 않는다', async () => {
      const mine = await newCouple()
      const theirs = await newCouple()
      const their = await createEntry(prisma, theirs.couple.id, theirs.members[0].id)
      await list(mine, `?cursor=${their.id}`).expect(400)
      const res = await list(mine).expect(200)
      expect(res.body.items).toEqual([])
    })
  })

  describe('GET·PATCH·DELETE /diary/:id', () => {
    it('조회는 두 멤버 모두, 다른 커플은 404', async () => {
      const session = await newCouple()
      const other = await newCouple()
      const entry = await createEntry(prisma, session.couple.id, session.members[0].id)
      const res = await http()
        .get(`${API}/${entry.id}`)
        .set(...bearer(session.tokens[1]))
        .expect(200)
      expect(res.body).toMatchObject({ id: entry.id, authorId: session.members[0].id, body: '성수동 산책' })
      await http()
        .get(`${API}/${entry.id}`)
        .set(...bearer(other.tokens[0]))
        .expect(404)
    })

    it('수정은 작성자만: 상대는 403, 다른 커플은 404, 작성자는 200', async () => {
      const session = await newCouple()
      const other = await newCouple()
      const entry = await createEntry(prisma, session.couple.id, session.members[0].id)
      const patch = (token: string, body: object) =>
        http()
          .patch(`${API}/${entry.id}`)
          .set(...bearer(token))
          .send(body)
      await patch(session.tokens[1], { body: '상대가 고침' }).expect(403)
      await patch(other.tokens[0], { body: '남이 고침' }).expect(404)
      const res = await patch(session.tokens[0], { body: '내가 고침', title: null, happenedOn: '2026-09-30' }).expect(
        200,
      )
      expect(res.body).toMatchObject({ body: '내가 고침', title: null, happenedOn: '2026-09-30' })
    })

    it('빈 본문 PATCH({})는 바꾸지 않고 현재 값(200). 상대는 403, 다른 커플은 404 그대로', async () => {
      const session = await newCouple()
      const other = await newCouple()
      const entry = await createEntry(prisma, session.couple.id, session.members[0].id)
      const patchEmpty = (token: string) =>
        http()
          .patch(`${API}/${entry.id}`)
          .set(...bearer(token))
          .send({})
      const res = await patchEmpty(session.tokens[0]).expect(200)
      expect(res.body).toMatchObject({ id: entry.id, body: '성수동 산책' })
      await patchEmpty(session.tokens[1]).expect(403)
      await patchEmpty(other.tokens[0]).expect(404)
    })

    it('placeId: 같은 커플 장소는 연결, null이면 해제, 다른 커플 장소는 404', async () => {
      const session = await newCouple()
      const other = await newCouple()
      const entry = await createEntry(prisma, session.couple.id, session.members[0].id)
      const place = await prisma.place.create({
        data: { coupleId: session.couple.id, name: '한강', lat: 37.5, lng: 127 },
      })
      const theirPlace = await prisma.place.create({
        data: { coupleId: other.couple.id, name: '남의 곳', lat: 1, lng: 1 },
      })
      const patch = (placeId: string | null) =>
        http()
          .patch(`${API}/${entry.id}`)
          .set(...bearer(session.tokens[0]))
          .send({ placeId })
      expect((await patch(place.id).expect(200)).body.placeId).toBe(place.id)
      await patch(theirPlace.id).expect(404)
      expect((await patch(null).expect(200)).body.placeId).toBeNull()
    })

    it('삭제는 작성자만(상대 403, 다른 커플 404). 사진 행은 Cascade, R2 키 삭제, 버킷 항목 연결은 해제', async () => {
      const session = await newCouple()
      const other = await newCouple()
      const entry = await createEntry(prisma, session.couple.id, session.members[0].id)
      const keep = await createEntry(prisma, session.couple.id, session.members[0].id)
      const photo = await createPhoto(prisma, session.couple.id, entry.id, session.members[1].id)
      const kept = await createPhoto(prisma, session.couple.id, keep.id, session.members[1].id)
      await prisma.photo.update({
        where: { id: photo.id },
        data: {
          status: 'READY',
          displayKey: `c/${session.couple.id}/p/${photo.id}/d.jpg`,
          thumbKey: `c/${session.couple.id}/p/${photo.id}/t.jpg`,
        },
      })
      const keys = [
        photo.originalKey,
        `c/${session.couple.id}/p/${photo.id}/d.jpg`,
        `c/${session.couple.id}/p/${photo.id}/t.jpg`,
        kept.originalKey,
      ]
      await Promise.all(
        keys.map((key) => storage.putObject({ key, body: Buffer.from('x'), contentType: 'image/jpeg' })),
      )
      const bucket = await prisma.bucketItem.create({
        data: { coupleId: session.couple.id, title: '제주', entryId: entry.id, doneAt: new Date() },
      })
      const remove = (token: string) =>
        http()
          .delete(`${API}/${entry.id}`)
          .set(...bearer(token))

      await remove(session.tokens[1]).expect(403)
      await remove(other.tokens[0]).expect(404)
      await remove(session.tokens[0]).expect(204)

      expect(await prisma.diaryEntry.count({ where: { id: entry.id } })).toBe(0)
      expect(await prisma.photo.count({ where: { id: photo.id } })).toBe(0)
      expect((await prisma.bucketItem.findFirstOrThrow({ where: { id: bucket.id } })).entryId).toBeNull()
      expect(await storage.listKeys(`c/${session.couple.id}/`)).toEqual([kept.originalKey])
      expect(await prisma.photo.count({ where: { id: kept.id } })).toBe(1)
    })
  })

  describe('POST /diary/auto-days', () => {
    it('날짜별 AUTO_DAY 엔트리를 멱등 생성한다(같은 날짜를 두 번·중복으로 보내도 1건)', async () => {
      const session = await newCouple()
      const send = (who: 0 | 1, dates: string[]) =>
        http()
          .post(`${API}/auto-days`)
          .set(...bearer(session.tokens[who]))
          .send({ dates })
      await createEntry(prisma, session.couple.id, session.members[0].id, { happenedOn: new Date('2026-09-01') })

      const first = await send(0, ['2026-09-02', '2026-09-01', '2026-09-01']).expect(200)
      expect(first.body.entries.map((entry: EntryBody) => entry.happenedOn)).toEqual(['2026-09-01', '2026-09-02'])
      const again = await send(1, ['2026-09-01', '2026-09-03']).expect(200)
      expect(again.body.entries[0]).toEqual(first.body.entries[0])

      const autos = await prisma.diaryEntry.findMany({ where: { coupleId: session.couple.id, kind: 'AUTO_DAY' } })
      expect(autos).toHaveLength(3)
      expect(autos.every((entry) => entry.body === '' && entry.title === null)).toBe(true)
      expect(autos.find((entry) => entry.happenedOn.toISOString().startsWith('2026-09-03'))?.authorId).toBe(
        session.members[1].id,
      )
      expect(await prisma.eventLog.count({ where: { name: 'memory_created' } })).toBe(0)
    })

    it.each([
      ['빈 배열', []],
      ['잘못된 날짜', ['2026-13-01']],
      ['367개', Array.from({ length: 367 }, () => '2026-01-01')],
    ])('%s → 400', async (_label, dates) => {
      const session = await newCouple()
      await http()
        .post(`${API}/auto-days`)
        .set(...bearer(session.tokens[0]))
        .send({ dates })
        .expect(400)
    })
  })
})
