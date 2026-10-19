import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { PlaceReportReviewService } from '../../src/places/place-report-review.service'
import { PrismaService } from '../../src/prisma/prisma.service'
import { bearer, consentedLogin, withEnv } from './auth-helpers'
import { bboxQuery, createPlace, SEONGSU } from './place-factories'
import { createTestApp } from './setup-app'
import { truncateAll } from './truncate'

const NEW_PLACE = {
  kind: 'NEW',
  name: '제보 카페',
  address: '서울 성동구 연무장길 1',
  category: 'CAFE',
  allowedSizes: ['S', 'M'],
  indoorAllowed: true,
  conditionsNote: '매너벨트 필수',
  lat: SEONGSU.lat + 0.001,
  lng: SEONGSU.lng,
  note: '사장님이 직접 알려주셨어요',
}

describe('장소 제보 → 검수 (실DB)', () => {
  let app: INestApplication
  let prisma: PrismaService
  let review: PlaceReportReviewService
  let restoreEnv: () => void
  let reporter: { accessToken: string; userId: string }

  beforeAll(async () => {
    restoreEnv = withEnv({ ENABLE_DEV_LOGIN: 'true', NODE_ENV: 'test' })
    app = await createTestApp()
    prisma = app.get(PrismaService)
    review = app.get(PlaceReportReviewService)
  })

  beforeEach(async () => {
    await truncateAll(prisma)
    reporter = await consentedLogin(app, '제보자')
  })

  afterAll(async () => {
    await app.close()
    restoreEnv()
  })

  const http = () => request(app.getHttpServer())
  const submit = (body: object, token = reporter.accessToken) =>
    http()
      .post('/api/v1/places/reports')
      .set(...bearer(token))
      .send(body)
  const placeNames = async () =>
    (
      await http()
        .get('/api/v1/places')
        .query(bboxQuery())
        .set(...bearer(reporter.accessToken))
        .expect(200)
    ).body.items.map((p: { name: string }) => p.name)

  it('신규 제보는 PENDING으로 저장되고 /places에 노출되지 않는다 → 승인 후 USER 출처·verifiedAt으로 반영 + 제보자 알림', async () => {
    const res = await submit(NEW_PLACE).expect(201)
    expect(res.body).toEqual({ id: expect.any(String), status: 'PENDING' })
    expect(await placeNames()).toEqual([])

    const before = Date.now()
    const { placeId } = await review.approveReport(res.body.id)

    expect(await placeNames()).toEqual(['제보 카페'])
    const place = await prisma.place.findUniqueOrThrow({ where: { id: placeId } })
    expect(place).toMatchObject({
      source: 'USER',
      sourceRef: res.body.id,
      conditionsNote: '매너벨트 필수',
      status: 'ACTIVE',
    })
    expect(place.verifiedAt?.getTime()).toBeGreaterThanOrEqual(before - 1000)

    const report = await prisma.placeReport.findUniqueOrThrow({ where: { id: res.body.id } })
    expect(report).toMatchObject({ status: 'APPROVED', placeId })
    expect(report.reviewedAt).not.toBeNull()
    const notifications = await prisma.notification.findMany({ where: { userId: reporter.userId } })
    expect(notifications).toEqual([expect.objectContaining({ kind: 'PLACE_REPORT_REVIEWED', refId: res.body.id })])
  })

  it('정보 수정 제보: 승인 전에는 그대로, 승인하면 보낸 필드만 반영하고 verifiedAt 갱신', async () => {
    const place = await createPlace(prisma, {
      name: '옛 이름',
      allowedSizes: ['S'],
      verifiedAt: new Date('2025-01-01'),
    })
    const res = await submit({
      kind: 'EDIT',
      placeId: place.id,
      allowedSizes: ['S', 'M', 'L'],
      note: '대형견도 돼요',
    }).expect(201)
    expect((await prisma.place.findUniqueOrThrow({ where: { id: place.id } })).allowedSizes).toEqual(['S'])

    await review.approveReport(res.body.id)

    const updated = await prisma.place.findUniqueOrThrow({ where: { id: place.id } })
    expect(updated).toMatchObject({ name: '옛 이름', allowedSizes: ['S', 'M', 'L'], source: 'PUBLIC_DATA' })
    expect(updated.verifiedAt?.getTime()).toBeGreaterThan(new Date('2025-01-01').getTime())
  })

  it('폐업 제보 승인 → CLOSED가 되어 목록에서 빠진다', async () => {
    const place = await createPlace(prisma, { name: '곧 폐업' })
    const res = await submit({ kind: 'CLOSED', placeId: place.id }).expect(201)
    expect(await placeNames()).toEqual(['곧 폐업'])
    await review.approveReport(res.body.id)
    expect(await placeNames()).toEqual([])
  })

  it('반려: REJECTED + reviewedAt, 장소는 그대로, 제보자 알림', async () => {
    const res = await submit(NEW_PLACE).expect(201)
    await review.rejectReport(res.body.id)
    const report = await prisma.placeReport.findUniqueOrThrow({ where: { id: res.body.id } })
    expect(report.status).toBe('REJECTED')
    expect(report.reviewedAt).not.toBeNull()
    expect(await prisma.place.count()).toBe(0)
    expect(await prisma.notification.count({ where: { userId: reporter.userId, kind: 'PLACE_REPORT_REVIEWED' } })).toBe(
      1,
    )
  })

  it('이미 처리된 제보는 다시 승인·반려할 수 없다(동시 승인해도 장소는 1개)', async () => {
    const res = await submit(NEW_PLACE).expect(201)
    const results = await Promise.allSettled([review.approveReport(res.body.id), review.approveReport(res.body.id)])
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
    expect(await prisma.place.count()).toBe(1)
    await expect(review.rejectReport(res.body.id)).rejects.toThrow('이미 처리')
    await expect(review.approveReport('0199e3a0-0000-7000-8000-000000000999')).rejects.toThrow('찾을 수 없')
  })

  it('제보자가 탈퇴해 reporterId가 null이어도 승인되고 알림은 만들지 않는다', async () => {
    const res = await submit(NEW_PLACE).expect(201)
    await prisma.placeReport.update({ where: { id: res.body.id }, data: { reporterId: null } })
    await review.approveReport(res.body.id)
    expect(await prisma.notification.count()).toBe(0)
  })

  it('수정·폐업 제보 대상이 없거나 숨김이면 404, 형식 오류 400', async () => {
    const hidden = await createPlace(prisma, { status: 'HIDDEN' })
    await submit({ kind: 'EDIT', placeId: hidden.id, name: '새 이름' }).expect(404)
    await submit({ kind: 'CLOSED', placeId: '0199e3a0-0000-7000-8000-000000000999' }).expect(404)
    await submit({ ...NEW_PLACE, allowedSizes: [] }).expect(400)
    await submit({ ...NEW_PLACE, kind: 'MOVE' }).expect(400)
    await submit({ kind: 'EDIT', name: '대상 없음' }).expect(400)
  })

  it('QA1 P3: 바뀌는 내용이 없는 정보 수정 제보는 400 PLACE_REPORT_NO_CHANGES (메모·사진만 있어도 허용)', async () => {
    const place = await createPlace(prisma, { name: '그대로', allowedSizes: ['S'] })
    const empty = await submit({ kind: 'EDIT', placeId: place.id }).expect(400)
    expect(empty.body.code).toBe('PLACE_REPORT_NO_CHANGES')
    const same = await submit({ kind: 'EDIT', placeId: place.id, name: '그대로', allowedSizes: ['S'] }).expect(400)
    expect(same.body.code).toBe('PLACE_REPORT_NO_CHANGES')
    expect(await prisma.placeReport.count()).toBe(0)

    await submit({ kind: 'EDIT', placeId: place.id, note: '주차 가능' }).expect(201)
  })

  it('GET /me/place-reports: 내 제보만 최신순으로, 상태·장소 이름 포함', async () => {
    const other = await consentedLogin(app, '다른사람')
    const place = await createPlace(prisma, { name: '기존 장소' })
    const newRes = await submit(NEW_PLACE).expect(201)
    const editRes = await submit({ kind: 'EDIT', placeId: place.id, note: '주차 가능' }).expect(201)
    await submit(NEW_PLACE, other.accessToken).expect(201)
    await review.rejectReport(newRes.body.id)

    const res = await http()
      .get('/api/v1/me/place-reports')
      .set(...bearer(reporter.accessToken))
      .expect(200)
    expect(res.body.items).toEqual([
      expect.objectContaining({
        id: editRes.body.id,
        kind: 'EDIT',
        placeId: place.id,
        placeName: '기존 장소',
        status: 'PENDING',
        reviewedAt: null,
      }),
      expect.objectContaining({
        id: newRes.body.id,
        kind: 'NEW',
        placeId: null,
        placeName: '제보 카페',
        status: 'REJECTED',
      }),
    ])
  })

  it('운영자 목록: 대기 제보만 오래된 순으로', async () => {
    const first = await submit(NEW_PLACE).expect(201)
    const second = await submit({ ...NEW_PLACE, name: '두 번째' }).expect(201)
    const third = await submit({ ...NEW_PLACE, name: '세 번째' }).expect(201)
    await review.rejectReport(third.body.id)
    const rows = await review.listPendingReports(10)
    expect(rows.map((r) => r.id)).toEqual([first.body.id, second.body.id])
    expect(rows[0]).toMatchObject({ kind: 'NEW', reporterId: reporter.userId })
    expect(rows[0]?.summary).toContain('제보 카페')
  })

  it('L5: allowedSizes는 3개 이하·중복 없이 (아니면 400)', async () => {
    await submit({ ...NEW_PLACE, allowedSizes: ['S', 'S'] }).expect(400)
    await submit({ ...NEW_PLACE, allowedSizes: ['S', 'M', 'L', 'L'] }).expect(400)
  })

  it('L5: 제보는 사용자당 시간당 10건 — 11번째 429, 다른 사용자는 별도', async () => {
    for (let i = 0; i < 10; i += 1) {
      await submit({ ...NEW_PLACE, name: `제보 ${i}` }).expect(201)
    }
    await submit(NEW_PLACE).expect(429)
    const other = await consentedLogin(app, '다른제보자')
    await submit(NEW_PLACE, other.accessToken).expect(201)
  })
})
