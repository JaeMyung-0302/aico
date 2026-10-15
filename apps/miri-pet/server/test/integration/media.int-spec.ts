import type { INestApplication } from '@nestjs/common'
import sharp from 'sharp'
import request from 'supertest'
import { ImageSanitizer, SanitizerBusyError } from '../../src/media/image-sanitizer'
import { MediaCleanupCron } from '../../src/media/media-cleanup.cron'
import { OBJECT_STORAGE } from '../../src/media/object-storage'
import { PrismaService } from '../../src/prisma/prisma.service'
import { bearer, consentedLogin, withEnv } from './auth-helpers'
import { createGpsJpeg, createInMemoryStorage, uploadImage } from './media-helpers'
import { createTestApp } from './setup-app'
import { truncateAll } from './truncate'

describe('미디어 업로드 파이프라인 (실DB, R2 메모리 대역)', () => {
  let app: INestApplication
  let prisma: PrismaService
  let restoreEnv: () => void
  const memory = createInMemoryStorage()

  beforeAll(async () => {
    restoreEnv = withEnv({ ENABLE_DEV_LOGIN: 'true', NODE_ENV: 'test', R2_PUBLIC_BASE_URL: 'https://img.test' })
    app = await createTestApp((builder) => builder.overrideProvider(OBJECT_STORAGE).useValue(memory.storage))
    prisma = app.get(PrismaService)
  })

  beforeEach(async () => {
    await truncateAll(prisma)
    memory.reset()
  })

  afterAll(async () => {
    await app.close()
    restoreEnv()
  })

  const http = () => request(app.getHttpServer())
  const presign = (token: string, body: Record<string, unknown>) =>
    http()
      .post('/api/v1/media/uploads')
      .set(...bearer(token))
      .send(body)

  it('presign: PENDING 행 + private incoming/ 5분 PUT URL(Content-Type·길이 서명)', async () => {
    const me = await consentedLogin(app, '업로더')
    const res = await presign(me.accessToken, { purpose: 'POST', mime: 'image/jpeg', bytes: 1234 }).expect(201)

    expect(res.body).toEqual({
      mediaId: expect.any(String),
      uploadUrl: expect.any(String),
      headers: { 'Content-Type': 'image/jpeg' },
      expiresAt: expect.any(String),
    })
    const url = new URL(res.body.uploadUrl)
    expect(url.hostname.startsWith('miripet-private.')).toBe(true)
    expect(url.pathname).toMatch(/^\/incoming\//)
    expect(url.searchParams.get('X-Amz-Expires')).toBe('300')
    expect(url.searchParams.get('X-Amz-SignedHeaders')).toContain('content-length')
    expect(url.searchParams.get('X-Amz-SignedHeaders')).toContain('content-type')
    const media = await prisma.media.findUniqueOrThrow({ where: { id: res.body.mediaId } })
    expect(media).toMatchObject({ ownerId: me.userId, status: 'PENDING', purpose: 'POST', bytes: 1234 })
  })

  it('presign 입력 검증: 허용되지 않은 mime·15MB 초과는 400', async () => {
    const me = await consentedLogin(app, '검증')
    await presign(me.accessToken, { purpose: 'POST', mime: 'image/gif', bytes: 10 }).expect(400)
    await presign(me.accessToken, { purpose: 'POST', mime: 'image/jpeg', bytes: 15 * 1024 * 1024 + 1 }).expect(400)
  })

  it('complete: 공개 이미지는 p/{id}/1440·480으로 재인코딩(EXIF 제거)되고 incoming은 지워진다', async () => {
    const me = await consentedLogin(app, '공개')
    const mediaId = await uploadImage(app, prisma, memory, me.accessToken, 'POST', await createGpsJpeg(3000, 2000))

    const media = await prisma.media.findUniqueOrThrow({ where: { id: mediaId } })
    expect(media).toMatchObject({ status: 'READY', bucket: 'PUBLIC', key: `p/${mediaId}/1440.jpg`, width: 1440 })
    const main = memory.read({ bucket: 'PUBLIC', key: `p/${mediaId}/1440.jpg` })
    const thumb = memory.read({ bucket: 'PUBLIC', key: `p/${mediaId}/480.jpg` })
    expect((await sharp(main ?? Buffer.alloc(0)).metadata()).exif).toBeUndefined()
    expect((await sharp(thumb ?? Buffer.alloc(0)).metadata()).width).toBe(480)
    expect(memory.keys().some((id) => id.includes('incoming/'))).toBe(false)
  })

  it('complete를 다시 불러도 같은 결과(멱등)', async () => {
    const me = await consentedLogin(app, '두번')
    const mediaId = await uploadImage(app, prisma, memory, me.accessToken, 'POST')
    const again = await http()
      .post(`/api/v1/media/${mediaId}/complete`)
      .set(...bearer(me.accessToken))
      .expect(200)
    expect(again.body).toEqual({
      id: mediaId,
      status: 'READY',
      url: `https://img.test/p/${mediaId}/1440.jpg`,
      thumbUrl: `https://img.test/p/${mediaId}/480.jpg`,
      width: expect.any(Number),
      height: expect.any(Number),
    })
  })

  it('업로드하지 않고 complete하면 409, 남의 미디어는 404', async () => {
    const me = await consentedLogin(app, '빈손')
    const other = await consentedLogin(app, '남의집')
    const res = await presign(me.accessToken, { purpose: 'POST', mime: 'image/jpeg', bytes: 100 }).expect(201)
    await http()
      .post(`/api/v1/media/${res.body.mediaId}/complete`)
      .set(...bearer(me.accessToken))
      .expect(409)
    await http()
      .post(`/api/v1/media/${res.body.mediaId}/complete`)
      .set(...bearer(other.accessToken))
      .expect(404)
  })

  it('이미지가 아닌 파일은 422 + REJECTED + incoming 삭제', async () => {
    const me = await consentedLogin(app, '가짜')
    const res = await presign(me.accessToken, { purpose: 'POST', mime: 'image/jpeg', bytes: 20 }).expect(201)
    const media = await prisma.media.findUniqueOrThrow({ where: { id: res.body.mediaId } })
    await memory.storage.putObject({
      bucket: 'PRIVATE',
      key: media.key,
      body: Buffer.from('#!/bin/sh echo pwned'),
      contentType: 'image/jpeg',
    })

    const rejected = await http()
      .post(`/api/v1/media/${media.id}/complete`)
      .set(...bearer(me.accessToken))
      .expect(422)
    expect(rejected.body.code).toBe('INVALID_IMAGE')
    expect((await prisma.media.findUniqueOrThrow({ where: { id: media.id } })).status).toBe('REJECTED')
    expect(memory.has({ bucket: 'PRIVATE', key: media.key })).toBe(false)
  })

  it('정리 크론: 24시간 지난 PENDING만 DB·R2에서 지운다', async () => {
    const me = await consentedLogin(app, '고아')
    const stale = await presign(me.accessToken, { purpose: 'POST', mime: 'image/jpeg', bytes: 10 }).expect(201)
    const fresh = await presign(me.accessToken, { purpose: 'POST', mime: 'image/jpeg', bytes: 10 }).expect(201)
    const ready = await uploadImage(app, prisma, memory, me.accessToken, 'POST')
    await prisma.media.updateMany({
      where: { id: { in: [stale.body.mediaId, ready] } },
      data: { createdAt: new Date(Date.now() - 25 * 3_600_000) },
    })
    const staleKey = (await prisma.media.findUniqueOrThrow({ where: { id: stale.body.mediaId } })).key
    await memory.storage.putObject({ bucket: 'PRIVATE', key: staleKey, body: Buffer.from('x'), contentType: 'x' })

    await expect(app.get(MediaCleanupCron).run()).resolves.toMatchObject({ deleted: 1 })

    expect(await prisma.media.findUnique({ where: { id: stale.body.mediaId } })).toBeNull()
    expect(await prisma.media.findUnique({ where: { id: fresh.body.mediaId } })).not.toBeNull()
    expect(await prisma.media.findUnique({ where: { id: ready } })).not.toBeNull()
    expect(memory.has({ bucket: 'PRIVATE', key: staleKey })).toBe(false)
  })

  describe('보안 리뷰 후속 (M2·M3·M4·L3·H1)', () => {
    const HOUR = 3_600_000
    const ago = (ms: number) => new Date(Date.now() - ms)
    const complete = (token: string, id: string) =>
      http()
        .post(`/api/v1/media/${id}/complete`)
        .set(...bearer(token))

    it('L3: presigned URL 응답은 Cache-Control: no-store', async () => {
      const me = await consentedLogin(app, '캐시')
      const res = await presign(me.accessToken, { purpose: 'POST', mime: 'image/jpeg', bytes: 10 }).expect(201)
      expect(res.headers['cache-control']).toBe('no-store')
    })

    it('M4: HEIC/HEIF mime은 presign 400', async () => {
      const me = await consentedLogin(app, '헤익')
      await presign(me.accessToken, { purpose: 'POST', mime: 'image/heic', bytes: 10 }).expect(400)
      await presign(me.accessToken, { purpose: 'POST', mime: 'image/heif', bytes: 10 }).expect(400)
    })

    it('M4: 디코딩 가능해도 jpeg·png·webp가 아니면(TIFF) 422 INVALID_IMAGE + REJECTED', async () => {
      const me = await consentedLogin(app, '티프')
      const tiff = await sharp({ create: { width: 32, height: 32, channels: 3, background: { r: 0, g: 0, b: 0 } } })
        .tiff()
        .toBuffer()
      const res = await presign(me.accessToken, { purpose: 'POST', mime: 'image/png', bytes: tiff.length }).expect(201)
      const media = await prisma.media.findUniqueOrThrow({ where: { id: res.body.mediaId } })
      await memory.storage.putObject({ bucket: 'PRIVATE', key: media.key, body: tiff, contentType: 'image/png' })
      const rejected = await complete(me.accessToken, media.id).expect(422)
      expect(rejected.body.code).toBe('INVALID_IMAGE')
      expect((await prisma.media.findUniqueOrThrow({ where: { id: media.id } })).status).toBe('REJECTED')
    })

    it('M3: PENDING 업로드가 20개면 presign 422 TOO_MANY_PENDING_UPLOADS (다른 사용자는 영향 없음)', async () => {
      const me = await consentedLogin(app, '쌓기')
      const other = await consentedLogin(app, '다른이')
      await prisma.media.createMany({
        data: Array.from({ length: 20 }, (_, i) => ({
          ownerId: me.userId,
          purpose: 'POST' as const,
          bucket: 'PUBLIC' as const,
          key: `incoming/pending-cap-${i}`,
          mime: 'image/jpeg',
          bytes: 10,
        })),
      })
      const res = await presign(me.accessToken, { purpose: 'POST', mime: 'image/jpeg', bytes: 10 }).expect(422)
      expect(res.body.code).toBe('TOO_MANY_PENDING_UPLOADS')
      await presign(other.accessToken, { purpose: 'POST', mime: 'image/jpeg', bytes: 10 }).expect(201)
    })

    it('M3: presign은 사용자당 분당 20회 — 21번째 429, 같은 IP의 다른 사용자는 별도 버킷', async () => {
      const me = await consentedLogin(app, '연타')
      const other = await consentedLogin(app, '옆사람')
      for (let i = 0; i < 20; i += 1) {
        await presign(me.accessToken, { purpose: 'POST', mime: 'image/jpeg', bytes: 10 }).expect(201)
      }
      await presign(me.accessToken, { purpose: 'POST', mime: 'image/jpeg', bytes: 10 }).expect(429)
      await presign(other.accessToken, { purpose: 'POST', mime: 'image/jpeg', bytes: 10 }).expect(201)
    })

    it('M3: complete도 사용자당 분당 20회', async () => {
      const me = await consentedLogin(app, '완료연타')
      const missing = '0199e3a0-0000-7000-8000-000000000000'
      for (let i = 0; i < 20; i += 1) {
        await complete(me.accessToken, missing).expect(404)
      }
      await complete(me.accessToken, missing).expect(429)
    })

    it('M3: 이미지 처리 대기열이 가득 차면 503 MEDIA_BUSY, 행은 PENDING으로 남아 다시 시도할 수 있다', async () => {
      const me = await consentedLogin(app, '혼잡')
      const res = await presign(me.accessToken, { purpose: 'POST', mime: 'image/jpeg', bytes: 10 }).expect(201)
      const media = await prisma.media.findUniqueOrThrow({ where: { id: res.body.mediaId } })
      await memory.storage.putObject({
        bucket: 'PRIVATE',
        key: media.key,
        body: await createGpsJpeg(),
        contentType: 'image/jpeg',
      })
      const spy = jest.spyOn(app.get(ImageSanitizer), 'sanitize').mockRejectedValueOnce(new SanitizerBusyError())
      try {
        const busy = await complete(me.accessToken, media.id).expect(503)
        expect(busy.body.code).toBe('MEDIA_BUSY')
        expect((await prisma.media.findUniqueOrThrow({ where: { id: media.id } })).status).toBe('PENDING')
      } finally {
        spy.mockRestore()
      }
      await complete(me.accessToken, media.id).expect(200)
    })

    it('M2: complete 뒤 같은 incoming 키에 다시 PUT해도 complete 재호출이 incoming을 지운다', async () => {
      const me = await consentedLogin(app, '재업로드')
      const mediaId = await uploadImage(app, prisma, memory, me.accessToken, 'POST')
      const incoming = { bucket: 'PRIVATE' as const, key: `incoming/${mediaId}` }
      await memory.storage.putObject({ ...incoming, body: Buffer.from('again'), contentType: 'image/jpeg' })
      expect(memory.has(incoming)).toBe(true)

      await complete(me.accessToken, mediaId).expect(200)

      expect(memory.has(incoming)).toBe(false)
      expect(memory.has({ bucket: 'PUBLIC', key: `p/${mediaId}/1440.jpg` })).toBe(true)
    })

    it('M2: 정리 크론은 오래된 PENDING의 최종 위치(공개 1440·480, 증명서 c/) 객체까지 지운다', async () => {
      const me = await consentedLogin(app, '반쯤')
      const pub = await presign(me.accessToken, { purpose: 'POST', mime: 'image/jpeg', bytes: 10 }).expect(201)
      const cert = await presign(me.accessToken, { purpose: 'CERTIFICATE', mime: 'image/jpeg', bytes: 10 }).expect(201)
      await prisma.media.updateMany({
        where: { id: { in: [pub.body.mediaId, cert.body.mediaId] } },
        data: { createdAt: ago(25 * HOUR) },
      })
      const leftovers = [
        { bucket: 'PUBLIC' as const, key: `p/${pub.body.mediaId}/1440.jpg` },
        { bucket: 'PUBLIC' as const, key: `p/${pub.body.mediaId}/480.jpg` },
        { bucket: 'PRIVATE' as const, key: `c/${me.userId}/${cert.body.mediaId}.jpg` },
      ]
      for (const target of leftovers) {
        await memory.storage.putObject({ ...target, body: Buffer.from('x'), contentType: 'image/jpeg' })
      }

      await expect(app.get(MediaCleanupCron).run()).resolves.toMatchObject({ deleted: 2 })

      expect(leftovers.filter((target) => memory.has(target))).toEqual([])
    })

    it('H1: 정리 크론은 24시간 넘게 어떤 접종 기록에도 안 붙은 READY 증명서를 DB·R2에서 지운다', async () => {
      const me = await consentedLogin(app, '증명서고아')
      const pet = await http()
        .post('/api/v1/pets')
        .set(...bearer(me.accessToken))
        .send({ name: '보리', species: 'DOG', size: 'S' })
        .expect(201)
      const orphan = await uploadImage(app, prisma, memory, me.accessToken, 'CERTIFICATE')
      const attached = await uploadImage(app, prisma, memory, me.accessToken, 'CERTIFICATE')
      const fresh = await uploadImage(app, prisma, memory, me.accessToken, 'CERTIFICATE')
      const readyPost = await uploadImage(app, prisma, memory, me.accessToken, 'POST')
      await http()
        .post(`/api/v1/pets/${pet.body.id}/vaccinations`)
        .set(...bearer(me.accessToken))
        .send({ type: 'DHPPL', administeredOn: '2026-10-01', certificateMediaIds: [attached] })
        .expect(201)
      await prisma.media.updateMany({
        where: { id: { in: [orphan, attached, readyPost] } },
        data: { createdAt: ago(25 * HOUR) },
      })

      await expect(app.get(MediaCleanupCron).run()).resolves.toEqual({
        deleted: 0,
        orphanCertificates: 1,
        orphanReportImages: 0,
      })

      const remaining = (await prisma.media.findMany({ select: { id: true } })).map((m) => m.id).sort()
      expect(remaining).toEqual([attached, fresh, readyPost].sort())
      expect(memory.has({ bucket: 'PRIVATE', key: `c/${me.userId}/${orphan}.jpg` })).toBe(false)
      expect(memory.has({ bucket: 'PRIVATE', key: `c/${me.userId}/${attached}.jpg` })).toBe(true)
    })
  })
})
