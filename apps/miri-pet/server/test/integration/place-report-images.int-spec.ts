import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { MediaCleanupCron } from '../../src/media/media-cleanup.cron'
import { OBJECT_STORAGE } from '../../src/media/object-storage'
import { PlaceReportReviewService } from '../../src/places/place-report-review.service'
import { PrismaService } from '../../src/prisma/prisma.service'
import { bearer, consentedLogin, withEnv } from './auth-helpers'
import { createInMemoryStorage, uploadImage } from './media-helpers'
import { createPlace, SEONGSU } from './place-factories'
import { createTestApp } from './setup-app'
import { truncateAll } from './truncate'

const NEW_PLACE = {
  kind: 'NEW',
  name: '사진 카페',
  address: '서울 성동구 연무장길 2',
  category: 'CAFE',
  allowedSizes: ['S'],
  indoorAllowed: true,
  lat: SEONGSU.lat,
  lng: SEONGSU.lng,
}

const HOUR = 60 * 60 * 1000

// C2: 장소 제보 안내문 사진(선택, 최대 3장) — private 버킷, 운영자만 presigned로 본다
describe('장소 제보 사진 첨부 (실DB)', () => {
  let app: INestApplication
  let prisma: PrismaService
  let review: PlaceReportReviewService
  let restoreEnv: () => void
  let reporter: { accessToken: string; userId: string }
  const memory = createInMemoryStorage()

  beforeAll(async () => {
    restoreEnv = withEnv({ ENABLE_DEV_LOGIN: 'true', NODE_ENV: 'test', R2_PUBLIC_BASE_URL: 'https://img.test' })
    app = await createTestApp((builder) => builder.overrideProvider(OBJECT_STORAGE).useValue(memory.storage))
    prisma = app.get(PrismaService)
    review = app.get(PlaceReportReviewService)
  })

  beforeEach(async () => {
    await truncateAll(prisma)
    memory.reset()
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
  const upload = (token = reporter.accessToken, purpose: 'PLACE_REPORT' | 'POST' = 'PLACE_REPORT') =>
    uploadImage(app, prisma, memory, token, purpose)
  const reportKey = (ownerId: string, mediaId: string) => ({
    bucket: 'PRIVATE' as const,
    key: `r/${ownerId}/${mediaId}.jpg`,
  })

  it('PLACE_REPORT 업로드는 private r/{ownerId}/{id}.jpg 에 저장되고 공개 URL이 없다', async () => {
    const presign = await http()
      .post('/api/v1/media/uploads')
      .set(...bearer(reporter.accessToken))
      .send({ purpose: 'PLACE_REPORT', mime: 'image/jpeg', bytes: 1000 })
      .expect(201)
    await prisma.media.delete({ where: { id: presign.body.mediaId } })

    const mediaId = await upload()
    const media = await prisma.media.findUniqueOrThrow({ where: { id: mediaId } })
    expect(media).toMatchObject({ purpose: 'PLACE_REPORT', bucket: 'PRIVATE', status: 'READY' })
    expect(media.key).toBe(`r/${reporter.userId}/${mediaId}.jpg`)
    expect(memory.has(reportKey(reporter.userId, mediaId))).toBe(true)
    expect(memory.keys().some((key) => key.startsWith('PUBLIC:'))).toBe(false)
  })

  it('제보에 사진을 순서대로 붙이고(payload에는 넣지 않음), 운영자 목록은 60초 presigned GET URL을 준다', async () => {
    const first = await upload()
    const second = await upload()
    const res = await submit({ ...NEW_PLACE, mediaIds: [first, second] }).expect(201)

    const images = await prisma.placeReportImage.findMany({
      where: { reportId: res.body.id },
      orderBy: { order: 'asc' },
    })
    expect(images.map((image) => image.mediaId)).toEqual([first, second])
    const report = await prisma.placeReport.findUniqueOrThrow({ where: { id: res.body.id } })
    expect(JSON.stringify(report.payload)).not.toContain('mediaIds')

    const [row] = await review.listPendingReports(10)
    expect(row?.imageUrls).toHaveLength(2)
    expect(row?.imageUrls[0]).toContain(`r/${reporter.userId}/${first}.jpg`)
    expect(row?.imageUrls[0]).toContain('X-Amz-Expires=60')
    expect(memory.storage.presignGet).toHaveBeenCalledWith({
      bucket: 'PRIVATE',
      key: `r/${reporter.userId}/${first}.jpg`,
      expiresIn: 60,
    })
  })

  it('사진 없이도 제보할 수 있다(imageUrls 빈 배열)', async () => {
    await submit(NEW_PLACE).expect(201)
    const [row] = await review.listPendingReports(10)
    expect(row?.imageUrls).toEqual([])
  })

  it('남의 사진·다른 용도·미완료·이미 다른 제보에 붙은 사진은 422, 4장 이상·중복은 400', async () => {
    const other = await consentedLogin(app, '다른사람')
    const othersImage = await upload(other.accessToken)
    const postImage = await upload(reporter.accessToken, 'POST')
    const pending = await http()
      .post('/api/v1/media/uploads')
      .set(...bearer(reporter.accessToken))
      .send({ purpose: 'PLACE_REPORT', mime: 'image/jpeg', bytes: 1000 })
      .expect(201)
    const used = await upload()
    await submit({ ...NEW_PLACE, mediaIds: [used] }).expect(201)

    for (const mediaId of [othersImage, postImage, pending.body.mediaId, used]) {
      const res = await submit({ ...NEW_PLACE, mediaIds: [mediaId] }).expect(422)
      expect(res.body.code).toBe('MEDIA_NOT_USABLE')
    }
    const many = await Promise.all([upload(), upload(), upload(), upload()])
    await submit({ ...NEW_PLACE, mediaIds: many }).expect(400)
    await submit({ ...NEW_PLACE, mediaIds: [many[0], many[0]] }).expect(400)
    expect(await prisma.placeReport.count()).toBe(1)
  })

  it('EDIT·CLOSED 제보에도 붙일 수 있다', async () => {
    const place = await createPlace(prisma, { name: '기존' })
    const mediaId = await upload()
    const res = await submit({ kind: 'CLOSED', placeId: place.id, mediaIds: [mediaId] }).expect(201)
    expect(await prisma.placeReportImage.count({ where: { reportId: res.body.id } })).toBe(1)
  })

  it.each(['approve', 'reject'] as const)('검수(%s)하면 사진 Media 행·R2 객체를 지운다', async (decision) => {
    const mediaId = await upload()
    const res = await submit({ ...NEW_PLACE, mediaIds: [mediaId] }).expect(201)

    if (decision === 'approve') await review.approveReport(res.body.id)
    else await review.rejectReport(res.body.id)

    expect(await prisma.media.count({ where: { id: mediaId } })).toBe(0)
    expect(await prisma.placeReportImage.count()).toBe(0)
    expect(memory.has(reportKey(reporter.userId, mediaId))).toBe(false)
  })

  it('탈퇴하면 제보는 남고(reporterId null) 사진 Media 행·R2 객체는 지운다', async () => {
    const mediaId = await upload()
    const res = await submit({ ...NEW_PLACE, mediaIds: [mediaId] }).expect(201)

    await http()
      .delete('/api/v1/me')
      .set(...bearer(reporter.accessToken))
      .expect(204)

    const report = await prisma.placeReport.findUniqueOrThrow({ where: { id: res.body.id } })
    expect(report.reporterId).toBeNull()
    expect(await prisma.media.count({ where: { id: mediaId } })).toBe(0)
    expect(await prisma.placeReportImage.count()).toBe(0)
    expect(memory.has(reportKey(reporter.userId, mediaId))).toBe(false)
  })

  it('24시간 넘게 어떤 제보에도 붙지 않은 READY 제보 사진은 정리 크론이 지운다', async () => {
    const orphan = await upload()
    const attached = await upload()
    const fresh = await upload()
    await submit({ ...NEW_PLACE, mediaIds: [attached] }).expect(201)
    await prisma.media.updateMany({
      where: { id: { in: [orphan, attached] } },
      data: { createdAt: new Date(Date.now() - 25 * HOUR) },
    })

    await expect(app.get(MediaCleanupCron).run()).resolves.toEqual({
      deleted: 0,
      orphanCertificates: 0,
      orphanReportImages: 1,
    })
    const remaining = (await prisma.media.findMany({ select: { id: true } })).map((m) => m.id).sort()
    expect(remaining).toEqual([attached, fresh].sort())
    expect(memory.has(reportKey(reporter.userId, orphan))).toBe(false)
    expect(memory.has(reportKey(reporter.userId, attached))).toBe(true)
  })
})
