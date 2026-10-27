import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { PUSH_SENDER } from '../../src/notifications/push.service'
import { PrismaService } from '../../src/prisma/prisma.service'
import { MemoryObjectStorage } from '../../src/storage/memory-object-storage'
import { OBJECT_STORAGE } from '../../src/storage/object-storage'
import { bearer } from './auth-helpers'
import { createCoupleSession, type CoupleSession } from './couple-session'
import { createEntry } from './factories'
import { createFakePush } from './fake-push'
import { createTestApp } from './setup-app'
import { truncateAll } from './truncate'

const API = '/api/v1/bucket'

describe('버킷리스트 (실DB)', () => {
  let app: INestApplication
  let prisma: PrismaService

  const http = () => request(app.getHttpServer())
  const newCouple = (overrides: Parameters<typeof createCoupleSession>[2] = {}) =>
    createCoupleSession(app, prisma, overrides)
  const add = (session: CoupleSession, who: 0 | 1, title: string) =>
    http()
      .post(API)
      .set(...bearer(session.tokens[who]))
      .send({ title })
  const patch = (session: CoupleSession, who: 0 | 1, id: string, body: object) =>
    http()
      .patch(`${API}/${id}`)
      .set(...bearer(session.tokens[who]))
      .send(body)
  const findRow = (session: CoupleSession, id: string) =>
    prisma.bucketItem.findFirst({ where: { id, coupleId: session.couple.id } })

  beforeAll(async () => {
    app = await createTestApp((builder) =>
      builder
        .overrideProvider(PUSH_SENDER)
        .useValue(createFakePush().sender)
        .overrideProvider(OBJECT_STORAGE)
        .useValue(new MemoryObjectStorage()),
    )
    prisma = app.get(PrismaService)
  })

  beforeEach(async () => {
    await truncateAll(prisma)
  })

  afterAll(async () => {
    await app.close()
  })

  describe('POST /bucket · GET /bucket', () => {
    it('추가는 두 멤버 모두, 응답은 BucketItem 모양, 목록은 우리 커플 것만 추가 순서대로', async () => {
      const session = await newCouple()
      const other = await newCouple()
      const first = await add(session, 0, ' 제주 가기 ').expect(201)
      const second = await add(session, 1, '같이 요리하기').expect(201)
      await add(other, 0, '남의 버킷').expect(201)

      expect(first.body).toEqual({
        id: expect.any(String),
        title: '제주 가기',
        doneAt: null,
        entryId: null,
        createdAt: expect.any(String),
      })
      expect((await findRow(session, second.body.id))?.createdById).toBe(session.members[1].id)
      const list = await http()
        .get(API)
        .set(...bearer(session.tokens[1]))
        .expect(200)
      expect(list.body).toEqual({ items: [first.body, second.body] })
    })

    it.each([
      ['빈 제목', ''],
      ['공백만', '   '],
      ['61자', 'a'.repeat(61)],
    ])('%s → 400', async (_label, title) => {
      const session = await newCouple()
      await add(session, 0, title).expect(400)
      expect(await prisma.bucketItem.count()).toBe(0)
    })

    it('60자는 허용', async () => {
      const session = await newCouple()
      await add(session, 0, 'a'.repeat(60)).expect(201)
    })

    it('연결 해제 유예 중에는 추가·수정·삭제 409, 조회는 200', async () => {
      const session = await newCouple({ status: 'UNLINKING', purgeAfter: new Date(Date.now() + 86_400_000) })
      const item = await prisma.bucketItem.create({ data: { coupleId: session.couple.id, title: '제주' } })
      await add(session, 0, '새 버킷').expect(409)
      await patch(session, 0, item.id, { done: true }).expect(409)
      await http()
        .delete(`${API}/${item.id}`)
        .set(...bearer(session.tokens[0]))
        .expect(409)
      await http()
        .get(API)
        .set(...bearer(session.tokens[0]))
        .expect(200)
    })
  })

  describe('PATCH /bucket/:id', () => {
    it('완료(doneAt) → 완료 취소(doneAt·entryId 해제), 두 멤버 모두 가능', async () => {
      const session = await newCouple()
      const { body: item } = await add(session, 0, '제주 가기').expect(201)
      const entry = await createEntry(prisma, session.couple.id, session.members[0].id)

      const done = await patch(session, 1, item.id, { done: true, entryId: entry.id }).expect(200)
      expect(done.body).toMatchObject({ id: item.id, entryId: entry.id, doneAt: expect.any(String) })
      expect(Date.now() - Date.parse(done.body.doneAt)).toBeLessThan(60_000)

      // 이미 완료한 항목을 다시 완료해도 처음 완료 시각을 유지한다
      const again = await patch(session, 0, item.id, { done: true }).expect(200)
      expect(again.body).toMatchObject({ doneAt: done.body.doneAt, entryId: entry.id })

      const undone = await patch(session, 0, item.id, { done: false }).expect(200)
      expect(undone.body).toMatchObject({ doneAt: null, entryId: null })
    })

    it('제목 수정, 완료한 항목의 일기 연결 변경·해제(entryId null)', async () => {
      const session = await newCouple()
      const { body: item } = await add(session, 0, '제주 가기').expect(201)
      const entry = await createEntry(prisma, session.couple.id, session.members[1].id)

      expect((await patch(session, 1, item.id, { title: '제주 한 달 살기' }).expect(200)).body.title).toBe(
        '제주 한 달 살기',
      )
      await patch(session, 0, item.id, { done: true }).expect(200)
      expect((await patch(session, 0, item.id, { entryId: entry.id }).expect(200)).body.entryId).toBe(entry.id)
      expect((await patch(session, 0, item.id, { entryId: null }).expect(200)).body).toMatchObject({
        entryId: null,
        doneAt: expect.any(String),
      })
    })

    it('완료하지 않은 항목에 일기를 연결하면 400 BUCKET_NOT_DONE(완료 취소와 함께 연결도 400)', async () => {
      const session = await newCouple()
      const { body: item } = await add(session, 0, '제주 가기').expect(201)
      const entry = await createEntry(prisma, session.couple.id, session.members[0].id)

      const res = await patch(session, 0, item.id, { entryId: entry.id }).expect(400)
      expect(res.body.code).toBe('BUCKET_NOT_DONE')
      await patch(session, 0, item.id, { done: false, entryId: entry.id }).expect(400)
      expect(await findRow(session, item.id)).toMatchObject({ doneAt: null, entryId: null })
    })

    it('완료 시 entryId는 같은 커플 일기만: 커플 B의 일기는 404, 항목 무변경', async () => {
      const session = await newCouple()
      const other = await newCouple()
      const { body: item } = await add(session, 0, '제주 가기').expect(201)
      const theirEntry = await createEntry(prisma, other.couple.id, other.members[0].id)

      await patch(session, 0, item.id, { done: true, entryId: theirEntry.id }).expect(404)
      expect(await findRow(session, item.id)).toMatchObject({ doneAt: null, entryId: null })
    })

    it('다른 커플 항목은 404, 빈 변경은 400', async () => {
      const session = await newCouple()
      const other = await newCouple()
      const { body: theirs } = await add(other, 0, '남의 버킷').expect(201)
      const { body: mine } = await add(session, 0, '내 버킷').expect(201)

      await patch(session, 0, theirs.id, { done: true }).expect(404)
      await patch(session, 0, mine.id, {}).expect(400)
      expect((await findRow(other, theirs.id))?.doneAt).toBeNull()
    })
  })

  describe('DELETE /bucket/:id', () => {
    it('두 멤버 모두 삭제 가능(연결된 일기는 남는다), 다른 커플 항목은 404', async () => {
      const session = await newCouple()
      const other = await newCouple()
      const entry = await createEntry(prisma, session.couple.id, session.members[0].id)
      const { body: item } = await add(session, 0, '제주 가기').expect(201)
      await patch(session, 0, item.id, { done: true, entryId: entry.id }).expect(200)
      const { body: theirs } = await add(other, 0, '남의 버킷').expect(201)

      await http()
        .delete(`${API}/${theirs.id}`)
        .set(...bearer(session.tokens[0]))
        .expect(404)
      await http()
        .delete(`${API}/${item.id}`)
        .set(...bearer(session.tokens[1]))
        .expect(204)
      expect(await findRow(session, item.id)).toBeNull()
      expect(await prisma.diaryEntry.count({ where: { id: entry.id, coupleId: session.couple.id } })).toBe(1)
      expect(await findRow(other, theirs.id)).not.toBeNull()
    })
  })
})
