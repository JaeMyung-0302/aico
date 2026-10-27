import { BadGatewayException, type INestApplication, Logger } from '@nestjs/common'
import request from 'supertest'
import { PUSH_SENDER } from '../../src/notifications/push.service'
import { KakaoLocalClient } from '../../src/places/kakao-local.client'
import { PrismaService } from '../../src/prisma/prisma.service'
import { MemoryObjectStorage } from '../../src/storage/memory-object-storage'
import { OBJECT_STORAGE } from '../../src/storage/object-storage'
import { bearer } from './auth-helpers'
import { createCoupleSession, type CoupleSession } from './couple-session'
import { createEntry } from './factories'
import { createFakeKakaoLocal, FAKE_SEARCH_RESULT, type FakeKakaoLocal } from './fake-kakao-local'
import { createFakePush } from './fake-push'
import { createTestApp } from './setup-app'
import { truncateAll } from './truncate'

const API = '/api/v1/places'
const KAKAO_LIMIT_PER_MINUTE = 30

describe('추억 지도 장소 (실DB)', () => {
  let app: INestApplication
  let prisma: PrismaService
  let kakao: FakeKakaoLocal

  const http = () => request(app.getHttpServer())
  const grantLocation = (session: CoupleSession) =>
    prisma.consent.createMany({
      data: session.members.map((member) => ({ userId: member.id, kind: 'LOCATION' as const, version: 'test' })),
    })
  // 위치 동의까지 마친 커플(지도 라우트는 좌표를 주고받는다)
  const newCouple = async (overrides: Parameters<typeof createCoupleSession>[2] = {}) => {
    const session = await createCoupleSession(app, prisma, overrides)
    await grantLocation(session)
    return session
  }
  const createPlace = (session: CoupleSession, who: 0 | 1, body: object) =>
    http()
      .post(API)
      .set(...bearer(session.tokens[who]))
      .send(body)
  const get = (session: CoupleSession, path: string, who: 0 | 1 = 0) =>
    http()
      .get(`${API}${path}`)
      .set(...bearer(session.tokens[who]))
  const seedPlace = (coupleId: string, data: { name: string; lat: number; lng: number }) =>
    prisma.place.create({ data: { coupleId, ...data } })

  beforeAll(async () => {
    kakao = createFakeKakaoLocal()
    app = await createTestApp((builder) =>
      builder
        .overrideProvider(PUSH_SENDER)
        .useValue(createFakePush().sender)
        .overrideProvider(OBJECT_STORAGE)
        .useValue(new MemoryObjectStorage())
        .overrideProvider(KakaoLocalClient)
        .useValue(kakao),
    )
    prisma = app.get(PrismaService)
  })

  beforeEach(async () => {
    await truncateAll(prisma)
    kakao.reset()
    jest.restoreAllMocks()
  })

  afterAll(async () => {
    await app.close()
  })

  describe('POST /places', () => {
    it('핀 생성: Place 모양 응답, 만든 사람은 요청 멤버, memory_created(type=place) 1건', async () => {
      const session = await newCouple()
      const res = await createPlace(session, 1, {
        name: ' 성수 카페 ',
        lat: 37.5443,
        lng: 127.0559,
        kakaoPlaceId: '26338954',
        address: '서울 성동구 연무장길 1',
      }).expect(201)

      expect(res.body).toEqual({
        id: expect.any(String),
        name: '성수 카페',
        lat: 37.5443,
        lng: 127.0559,
        kakaoPlaceId: '26338954',
        address: '서울 성동구 연무장길 1',
        createdAt: expect.any(String),
      })
      const row = await prisma.place.findFirstOrThrow({ where: { id: res.body.id, coupleId: session.couple.id } })
      expect(row.createdById).toBe(session.members[1].id)
      const events = await prisma.eventLog.findMany({ where: { coupleId: session.couple.id, name: 'memory_created' } })
      expect(events.map((event) => event.props)).toEqual([{ type: 'place' }])
    })

    it.each([
      ['이름 없음', { name: '', lat: 37, lng: 127 }],
      ['이름 51자', { name: 'a'.repeat(51), lat: 37, lng: 127 }],
      ['lat 범위 밖', { name: '여기', lat: 90.5, lng: 127 }],
      ['lng 누락', { name: '여기', lat: 37 }],
    ])('%s → 400', async (_label, body) => {
      const session = await newCouple()
      await createPlace(session, 0, body).expect(400)
      expect(await prisma.place.count()).toBe(0)
    })

    it('위치 동의가 없으면 403 LOCATION_CONSENT_REQUIRED, 행 없음', async () => {
      const session = await createCoupleSession(app, prisma)
      const res = await createPlace(session, 0, { name: '여기', lat: 37, lng: 127 }).expect(403)
      expect(res.body.code).toBe('LOCATION_CONSENT_REQUIRED')
      expect(await prisma.place.count()).toBe(0)
    })

    it('연결 해제 유예 중에는 409, 조회는 200', async () => {
      const session = await newCouple({ status: 'UNLINKING', purgeAfter: new Date(Date.now() + 86_400_000) })
      await createPlace(session, 0, { name: '여기', lat: 37, lng: 127 }).expect(409)
      await get(session, '').expect(200)
    })
  })

  describe('GET /places?bbox', () => {
    it('bbox(minLng,minLat,maxLng,maxLat) 안의 우리 커플 핀만, bbox가 없으면 전체', async () => {
      const session = await newCouple()
      const other = await newCouple()
      const seoul = await seedPlace(session.couple.id, { name: '서울', lat: 37.56, lng: 126.97 })
      const busan = await seedPlace(session.couple.id, { name: '부산', lat: 35.18, lng: 129.07 })
      await seedPlace(other.couple.id, { name: '남의 서울', lat: 37.56, lng: 126.98 })

      const inSeoul = await get(session, '?bbox=126.5,37.0,127.5,38.0').expect(200)
      expect(inSeoul.body.items.map((item: { id: string }) => item.id)).toEqual([seoul.id])
      const all = await get(session, '').expect(200)
      expect(all.body.items.map((item: { id: string }) => item.id)).toEqual([seoul.id, busan.id])
    })

    it('경계값은 포함, 잘못된 bbox는 400', async () => {
      const session = await newCouple()
      const edge = await seedPlace(session.couple.id, { name: '모서리', lat: 37, lng: 127 })
      const res = await get(session, '?bbox=127,37,127.1,37.1').expect(200)
      expect(res.body.items.map((item: { id: string }) => item.id)).toEqual([edge.id])
      await get(session, '?bbox=127,37,126').expect(400)
      await get(session, '?bbox=128,37,127,38').expect(400)
    })

    it('위치 동의가 없으면 목록도 403 LOCATION_CONSENT_REQUIRED', async () => {
      const session = await createCoupleSession(app, prisma)
      const res = await get(session, '').expect(403)
      expect(res.body.code).toBe('LOCATION_CONSENT_REQUIRED')
    })
  })

  describe('GET·PATCH·DELETE /places/:id', () => {
    it('상세·수정은 두 멤버 모두, 다른 커플 장소는 404', async () => {
      const session = await newCouple()
      const other = await newCouple()
      const { body: place } = await createPlace(session, 0, { name: '한강', lat: 37.52, lng: 126.93 }).expect(201)
      const theirs = await seedPlace(other.couple.id, { name: '남의 곳', lat: 1, lng: 1 })

      expect((await get(session, `/${place.id}`, 1).expect(200)).body).toEqual(place)
      const patched = await http()
        .patch(`${API}/${place.id}`)
        .set(...bearer(session.tokens[1]))
        .send({ name: '여의도 한강', address: '서울 영등포구' })
        .expect(200)
      expect(patched.body).toMatchObject({ id: place.id, name: '여의도 한강', address: '서울 영등포구', lat: 37.52 })

      await get(session, `/${theirs.id}`).expect(404)
      await http()
        .patch(`${API}/${theirs.id}`)
        .set(...bearer(session.tokens[0]))
        .send({ name: '탈취' })
        .expect(404)
      await http()
        .delete(`${API}/${theirs.id}`)
        .set(...bearer(session.tokens[0]))
        .expect(404)
      expect((await prisma.place.findFirstOrThrow({ where: { id: theirs.id, coupleId: other.couple.id } })).name).toBe(
        '남의 곳',
      )
    })

    it('삭제하면 연결된 일기의 placeId를 먼저 비우고(일기는 남음) 204', async () => {
      const session = await newCouple()
      const { body: place } = await createPlace(session, 0, { name: '한강', lat: 37.52, lng: 126.93 }).expect(201)
      const entry = await createEntry(prisma, session.couple.id, session.members[0].id, { placeId: place.id })

      await http()
        .delete(`${API}/${place.id}`)
        .set(...bearer(session.tokens[1]))
        .expect(204)

      expect(await prisma.place.count({ where: { coupleId: session.couple.id } })).toBe(0)
      const after = await prisma.diaryEntry.findFirstOrThrow({ where: { id: entry.id, coupleId: session.couple.id } })
      expect(after.placeId).toBeNull()
      await get(session, `/${place.id}`).expect(404)
    })

    it('위치 동의를 철회해도 핀 삭제는 할 수 있다', async () => {
      const session = await createCoupleSession(app, prisma)
      const place = await seedPlace(session.couple.id, { name: '한강', lat: 37.52, lng: 126.93 })
      await http()
        .delete(`${API}/${place.id}`)
        .set(...bearer(session.tokens[0]))
        .expect(204)
    })
  })

  describe('GET /places/:id/entries', () => {
    it('그 장소에 연결된 우리 커플 일기만(happenedOn desc), 커서 페이지', async () => {
      const session = await newCouple()
      const { body: place } = await createPlace(session, 0, { name: '한강', lat: 37.52, lng: 126.93 }).expect(201)
      const older = await createEntry(prisma, session.couple.id, session.members[0].id, {
        placeId: place.id,
        happenedOn: new Date('2026-09-01'),
      })
      const newer = await createEntry(prisma, session.couple.id, session.members[1].id, {
        placeId: place.id,
        happenedOn: new Date('2026-10-01'),
      })
      await createEntry(prisma, session.couple.id, session.members[0].id)

      const first = await get(session, `/${place.id}/entries?limit=1`).expect(200)
      expect(first.body.items.map((item: { id: string }) => item.id)).toEqual([newer.id])
      expect(first.body.nextCursor).toBe(newer.id)
      const second = await get(session, `/${place.id}/entries?limit=1&cursor=${newer.id}`).expect(200)
      expect(second.body).toMatchObject({ items: [{ id: older.id, placeId: place.id }], nextCursor: null })
    })

    it('다른 커플 장소는 404', async () => {
      const session = await newCouple()
      const other = await newCouple()
      const theirs = await seedPlace(other.couple.id, { name: '남의 곳', lat: 1, lng: 1 })
      await createEntry(prisma, other.couple.id, other.members[0].id, { placeId: theirs.id })
      await get(session, `/${theirs.id}/entries`).expect(404)
    })
  })

  describe('PATCH /diary/:id { placeId }', () => {
    it('POST /places로 만든 우리 핀은 연결되고, 커플 B의 placeId는 404(일기 무변경)', async () => {
      const session = await newCouple()
      const other = await newCouple()
      const entry = await createEntry(prisma, session.couple.id, session.members[0].id)
      const { body: mine } = await createPlace(session, 0, { name: '한강', lat: 37.52, lng: 126.93 }).expect(201)
      const { body: theirs } = await createPlace(other, 0, { name: '남의 곳', lat: 35, lng: 129 }).expect(201)
      const patch = (placeId: string) =>
        http()
          .patch(`/api/v1/diary/${entry.id}`)
          .set(...bearer(session.tokens[0]))
          .send({ placeId })

      expect((await patch(mine.id).expect(200)).body.placeId).toBe(mine.id)
      await patch(theirs.id).expect(404)
      const after = await prisma.diaryEntry.findFirstOrThrow({ where: { id: entry.id, coupleId: session.couple.id } })
      expect(after.placeId).toBe(mine.id)
    })
  })

  describe('GET /places/search · /places/reverse (카카오 로컬 프록시)', () => {
    it('search?q는 { items: PlaceSearchResult[] }, reverse?lat&lng는 { address }', async () => {
      const session = await newCouple()
      expect((await get(session, `/search?q=${encodeURIComponent('성수 카페')}`).expect(200)).body).toEqual({
        items: [FAKE_SEARCH_RESULT],
      })
      expect((await get(session, '/reverse?lat=37.5443&lng=127.0559').expect(200)).body).toEqual({
        address: FAKE_SEARCH_RESULT.address,
      })
    })

    it('잘못된 입력은 카카오를 부르지 않고 400', async () => {
      const session = await newCouple()
      await get(session, '/search?q=').expect(400)
      await get(session, `/search?q=${'a'.repeat(101)}`).expect(400)
      await get(session, '/reverse?lat=91&lng=127').expect(400)
      await get(session, '/reverse?lat=37').expect(400)
      expect(kakao.calls()).toBe(0)
    })

    it(`사용자당 1분에 ${KAKAO_LIMIT_PER_MINUTE}회(search·reverse 합산), 넘으면 429 RATE_LIMITED. 상대 멤버는 별도`, async () => {
      const session = await newCouple()
      const calls = Array.from({ length: KAKAO_LIMIT_PER_MINUTE }, (_, index) =>
        index % 2 === 0 ? `/search?q=${index}` : '/reverse?lat=37.5&lng=127',
      )
      for (const path of calls) {
        await get(session, path).expect(200)
      }
      const blocked = await get(session, '/search?q=more').expect(429)
      expect(blocked.body.code).toBe('RATE_LIMITED')
      await get(session, '/reverse?lat=37.5&lng=127').expect(429)
      await get(session, '/search?q=partner', 1).expect(200)
      expect(kakao.calls()).toBe(KAKAO_LIMIT_PER_MINUTE + 1)
    })

    it('위치 동의가 없으면 403 LOCATION_CONSENT_REQUIRED, 카카오 호출 없음', async () => {
      const session = await createCoupleSession(app, prisma)
      const res = await get(session, '/reverse?lat=37.5&lng=127').expect(403)
      expect(res.body.code).toBe('LOCATION_CONSENT_REQUIRED')
      expect(kakao.calls()).toBe(0)
    })

    it('카카오 실패(502)여도 서버 로그에 검색어·좌표가 0회', async () => {
      const session = await newCouple()
      const logged = (['log', 'warn', 'error', 'debug'] as const).map((level) =>
        jest.spyOn(Logger.prototype, level).mockImplementation(() => undefined),
      )
      jest.spyOn(kakao, 'search').mockRejectedValueOnce(new BadGatewayException({ code: 'PLACE_SEARCH_FAILED' }))
      jest.spyOn(kakao, 'reverse').mockRejectedValueOnce(new BadGatewayException({ code: 'PLACE_SEARCH_FAILED' }))

      const res = await get(session, `/search?q=${encodeURIComponent('우리집 근처 비밀')}`).expect(502)
      expect(res.body.code).toBe('PLACE_SEARCH_FAILED')
      await get(session, '/reverse?lat=37.123456&lng=127.654321').expect(502)

      const text = logged
        .flatMap((spy) => spy.mock.calls)
        .map((call) => call.map(String).join(' '))
        .join('\n')
      expect(text).toContain('/api/v1/places/search')
      expect(text).not.toMatch(/우리집|%EC%9A%B0|37\.123456|127\.654321/)
    })
  })
})
