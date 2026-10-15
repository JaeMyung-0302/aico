import type { INestApplication } from '@nestjs/common'
import { PLACES_BBOX_MAX_RESULTS } from '@miri-pet/shared'
import request from 'supertest'
import { PrismaService } from '../../src/prisma/prisma.service'
import { bearer, consentedLogin, withEnv } from './auth-helpers'
import { bboxQuery, createPlace, placeData, SEONGSU, SEONGSU_BBOX } from './place-factories'
import { createTestApp } from './setup-app'
import { truncateAll } from './truncate'

describe('동반 장소 조회 (실DB)', () => {
  let app: INestApplication
  let prisma: PrismaService
  let restoreEnv: () => void
  let token: string

  beforeAll(async () => {
    restoreEnv = withEnv({ ENABLE_DEV_LOGIN: 'true', NODE_ENV: 'test' })
    app = await createTestApp()
    prisma = app.get(PrismaService)
  })

  beforeEach(async () => {
    await truncateAll(prisma)
    token = (await consentedLogin(app, '산책러')).accessToken
  })

  afterAll(async () => {
    await app.close()
    restoreEnv()
  })

  const listPlaces = (query: Record<string, string | number | boolean>) =>
    request(app.getHttpServer())
      .get('/api/v1/places')
      .query(query)
      .set(...bearer(token))

  it('로그인하지 않으면 401', async () => {
    await request(app.getHttpServer()).get('/api/v1/places').query(bboxQuery()).expect(401)
  })

  it('bbox 밖 장소는 제외하고, 응답에 출처·최종 확인일을 담는다', async () => {
    const inside = await createPlace(prisma, { name: '안쪽', verifiedAt: new Date('2026-10-02T00:00:00Z') })
    await createPlace(prisma, { name: '강남', lat: 37.4979, lng: 127.0276 })

    const res = await listPlaces(bboxQuery()).expect(200)
    expect(res.body).toEqual({
      isTruncated: false,
      items: [
        {
          id: inside.id,
          name: '안쪽',
          category: 'CAFE',
          address: '서울 성동구 성수동',
          lat: SEONGSU.lat,
          lng: SEONGSU.lng,
          allowedSizes: ['S'],
          indoorAllowed: false,
          conditionsNote: null,
          source: 'PUBLIC_DATA',
          verifiedAt: '2026-10-02T00:00:00.000Z',
        },
      ],
    })
  })

  it('size=L 필터: 대형견 허용 장소만', async () => {
    await createPlace(prisma, { name: '소형만', allowedSizes: ['S'] })
    await createPlace(prisma, { name: '대형까지', allowedSizes: ['S', 'M', 'L'] })
    const res = await listPlaces({ ...bboxQuery(), size: 'L' }).expect(200)
    expect(res.body.items.map((p: { name: string }) => p.name)).toEqual(['대형까지'])
  })

  it('category·indoor 필터를 함께 적용한다', async () => {
    await createPlace(prisma, { name: '실내 카페', category: 'CAFE', indoorAllowed: true })
    await createPlace(prisma, { name: '야외 카페', category: 'CAFE', indoorAllowed: false })
    await createPlace(prisma, { name: '실내 식당', category: 'RESTAURANT', indoorAllowed: true })
    const res = await listPlaces({ ...bboxQuery(), category: 'CAFE', indoor: true }).expect(200)
    expect(res.body.items.map((p: { name: string }) => p.name)).toEqual(['실내 카페'])
  })

  it('HIDDEN·CLOSED 장소는 제외한다', async () => {
    await createPlace(prisma, { name: '활성' })
    await createPlace(prisma, { name: '숨김', status: 'HIDDEN' })
    await createPlace(prisma, { name: '폐업', status: 'CLOSED' })
    const res = await listPlaces(bboxQuery()).expect(200)
    expect(res.body.items.map((p: { name: string }) => p.name)).toEqual(['활성'])
  })

  it(`bbox 안에 400건이 있어도 ${PLACES_BBOX_MAX_RESULTS}건만 반환하고 isTruncated=true`, async () => {
    await prisma.place.createMany({
      data: Array.from({ length: 400 }, (_, i) =>
        placeData({ name: `장소${i}`, lat: SEONGSU_BBOX.swLat + 0.00004 * (i + 1), lng: SEONGSU.lng }),
      ),
    })
    const res = await listPlaces(bboxQuery()).expect(200)
    expect(res.body.items).toHaveLength(PLACES_BBOX_MAX_RESULTS)
    expect(res.body.isTruncated).toBe(true)
  })

  it('sort=distance: bbox 중심에서 가까운 순', async () => {
    const center = {
      lat: (SEONGSU_BBOX.swLat + SEONGSU_BBOX.neLat) / 2,
      lng: (SEONGSU_BBOX.swLng + SEONGSU_BBOX.neLng) / 2,
    }
    await createPlace(prisma, { name: '먼', lat: center.lat + 0.008, lng: center.lng })
    await createPlace(prisma, { name: '가까운', lat: center.lat + 0.001, lng: center.lng })
    await createPlace(prisma, { name: '중간', lat: center.lat - 0.004, lng: center.lng })
    const res = await listPlaces({ ...bboxQuery(), sort: 'distance' }).expect(200)
    expect(res.body.items.map((p: { name: string }) => p.name)).toEqual(['가까운', '중간', '먼'])
  })

  it('잘못된 bbox: sw > ne 400, 대각선 50km 초과 400, 파라미터 누락 400', async () => {
    await listPlaces({ ...bboxQuery(), swLat: 37.6, neLat: 37.5 }).expect(400)
    await listPlaces({ swLat: 36.35, swLng: 126.9, neLat: 37.6, neLng: 127.4 }).expect(400)
    await listPlaces({ swLat: 37.5 }).expect(400)
  })

  it('GET /places/:id: 상세(출처·확인일 포함), 숨김·없는 장소 404, uuid 아님 400', async () => {
    const place = await createPlace(prisma, { name: '상세', source: 'TOUR_API', conditionsNote: '매너벨트' })
    const hidden = await createPlace(prisma, { status: 'HIDDEN' })
    const res = await request(app.getHttpServer())
      .get(`/api/v1/places/${place.id}`)
      .set(...bearer(token))
      .expect(200)
    expect(res.body).toMatchObject({
      id: place.id,
      name: '상세',
      source: 'TOUR_API',
      conditionsNote: '매너벨트',
      verifiedAt: null,
    })

    for (const id of [hidden.id, '0199e3a0-0000-7000-8000-000000000999']) {
      await request(app.getHttpServer())
        .get(`/api/v1/places/${id}`)
        .set(...bearer(token))
        .expect(404)
    }
    await request(app.getHttpServer())
      .get('/api/v1/places/not-a-uuid')
      .set(...bearer(token))
      .expect(400)
  })
})
