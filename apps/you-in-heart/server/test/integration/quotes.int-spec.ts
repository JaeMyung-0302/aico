import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { INestApplication } from '@nestjs/common'
import { MAX_QUOTE_REQUEST_BYTES, MAX_SCREENSHOT_BYTES } from '@you-in-heart/shared'
import sharp from 'sharp'
import request from 'supertest'
import { PurgeService } from '../../src/couples/purge.service'
import { ImageSanitizer, PHOTO_MAX_INPUT_PIXELS } from '../../src/photos/image-sanitizer'
import { PUSH_SENDER } from '../../src/notifications/push.service'
import { PrismaService } from '../../src/prisma/prisma.service'
import { MemoryObjectStorage } from '../../src/storage/memory-object-storage'
import { OBJECT_STORAGE } from '../../src/storage/object-storage'
import { quoteScreenshotIncomingKey, quoteScreenshotKey, quoteScreenshotThumbKey } from '../../src/storage/storage-keys'
import { bearer } from './auth-helpers'
import { createCoupleSession, type CoupleSession } from './couple-session'
import { createFakePush } from './fake-push'
import { createTestApp } from './setup-app'
import { truncateAll } from './truncate'

const API = '/api/v1/quotes'
const fixture = (name: string): Buffer => readFileSync(resolve(__dirname, '../fixtures', name))
const expiresOf = (url: string): number => Number(new URL(url).searchParams.get('X-Amz-Expires'))
// GPS IFD 포인터 태그(0x8825)가 EXIF 안에 있는지
const hasGps = async (body: Buffer): Promise<boolean> =>
  (await sharp(body).metadata()).exif?.includes(Buffer.from([0x25, 0x88])) === true

type QuoteBody = { id: string; source: string; text: string | null; screenshotUrl: string | null }

describe('문구 보관함 (실DB + 메모리 스토리지)', () => {
  let app: INestApplication
  let prisma: PrismaService
  let storage: MemoryObjectStorage

  const http = () => request(app.getHttpServer())
  const newCouple = (overrides: Parameters<typeof createCoupleSession>[2] = {}) =>
    createCoupleSession(app, prisma, overrides)
  const post = (session: CoupleSession, who: 0 | 1, path: string, body: object) =>
    http()
      .post(`${API}${path}`)
      .set(...bearer(session.tokens[who]))
      .send(body)
  const list = (session: CoupleSession, query = '', who: 0 | 1 = 0) =>
    http()
      .get(`${API}${query}`)
      .set(...bearer(session.tokens[who]))
  const eventsOf = (session: CoupleSession, name: string) =>
    prisma.eventLog.findMany({ where: { coupleId: session.couple.id, name }, orderBy: { createdAt: 'asc' } })
  // 앱의 presigned PUT을 흉내 낸다(스크린샷 → incoming)
  const startScreenshot = async (session: CoupleSession, body: Buffer, mime = 'image/jpeg') => {
    const res = await post(session, 0, '/screenshots/uploads', { mime, bytes: body.length, memo: '첫 고백' }).expect(
      201,
    )
    const quoteId = String(res.body.quoteId)
    await storage.putObject({
      key: quoteScreenshotIncomingKey(session.couple.id, quoteId),
      body,
      contentType: mime,
    })
    return { quoteId, body: res.body }
  }
  const complete = (session: CoupleSession, quoteId: string, who: 0 | 1 = 0) =>
    post(session, who, `/${quoteId}/screenshot/complete`, {})

  beforeAll(async () => {
    storage = new MemoryObjectStorage()
    app = await createTestApp((builder) =>
      builder
        .overrideProvider(PUSH_SENDER)
        .useValue(createFakePush().sender)
        .overrideProvider(OBJECT_STORAGE)
        .useValue(storage),
    )
    prisma = app.get(PrismaService)
  })

  beforeEach(async () => {
    await truncateAll(prisma)
    storage.clear()
  })

  afterAll(async () => {
    await app.close()
  })

  describe('POST /quotes', () => {
    it('SHARE·TXT 텍스트 문구: Quote 모양 응답, memory_created(type=quote) 1건', async () => {
      const session = await newCouple()
      const res = await post(session, 1, '', {
        source: 'SHARE',
        text: ' 보고 싶어 ',
        speakerLabel: 'A',
        saidAt: '2026-10-18T21:00:00+09:00',
        memo: '퇴근길',
      }).expect(201)

      expect(res.body).toEqual({
        id: expect.any(String),
        source: 'SHARE',
        text: '보고 싶어',
        speakerLabel: 'A',
        saidAt: '2026-10-18T12:00:00.000Z',
        memo: '퇴근길',
        screenshotUrl: null,
        screenshotThumbUrl: null,
        createdAt: expect.any(String),
      })
      const row = await prisma.quote.findFirstOrThrow({ where: { id: res.body.id, coupleId: session.couple.id } })
      expect(row.createdById).toBe(session.members[1].id)
      expect((await eventsOf(session, 'memory_created')).map((event) => event.props)).toEqual([{ type: 'quote' }])
    })

    it.each([
      ['빈 텍스트', { source: 'SHARE', text: '' }],
      ['2,001자', { source: 'TXT', text: 'a'.repeat(2001) }],
      ['SCREENSHOT은 업로드 경로만', { source: 'SCREENSHOT', text: '사랑해' }],
      ['saidAt 형식 오류', { source: 'TXT', text: '사랑해', saidAt: '어제' }],
    ])('%s → 400', async (_label, body) => {
      const session = await newCouple()
      await post(session, 0, '', body).expect(400)
      expect(await prisma.quote.count()).toBe(0)
    })

    it('2,000자는 허용', async () => {
      const session = await newCouple()
      await post(session, 0, '', { source: 'TXT', text: '가'.repeat(2000) }).expect(201)
    })

    it('연결 해제 유예 중에는 409, 조회는 200', async () => {
      const session = await newCouple({ status: 'UNLINKING', purgeAfter: new Date(Date.now() + 86_400_000) })
      await post(session, 0, '', { source: 'SHARE', text: '사랑해' }).expect(409)
      await post(session, 0, '/bulk', { items: [{ text: '사랑해' }] }).expect(409)
      await post(session, 0, '/screenshots/uploads', { mime: 'image/jpeg', bytes: 100 }).expect(409)
      await list(session).expect(200)
    })
  })

  describe('POST /quotes/bulk', () => {
    it('최대 200건을 TXT로 저장 → { created }, kakao_import_completed 1건', async () => {
      const session = await newCouple()
      const items = Array.from({ length: 200 }, (_, index) => ({
        text: `문구 ${index}`,
        speakerLabel: index % 2 === 0 ? 'A' : 'B',
        saidAt: '2026-10-18T21:00:00+09:00',
      }))
      const res = await post(session, 0, '/bulk', { items }).expect(201)

      expect(res.body).toEqual({ created: 200 })
      expect(await prisma.quote.count({ where: { coupleId: session.couple.id, source: 'TXT' } })).toBe(200)
      const imports = await eventsOf(session, 'kakao_import_completed')
      expect(imports.map((event) => event.props)).toEqual([{ count: 200 }])
      expect((await eventsOf(session, 'memory_created')).map((event) => event.props)).toEqual([
        { type: 'quote', count: 200 },
      ])
    })

    it('201건은 400, 행 없음', async () => {
      const session = await newCouple()
      const items = Array.from({ length: 201 }, () => ({ text: '사랑해' }))
      await post(session, 0, '/bulk', { items }).expect(400)
      expect(await prisma.quote.count()).toBe(0)
    })

    it(`본문이 ${MAX_QUOTE_REQUEST_BYTES}바이트를 넘으면 413 PAYLOAD_TOO_LARGE(원문 txt 업로드 차단), 이하면 201`, async () => {
      const session = await newCouple()
      // 1,000바이트 × 70건 ≈ 70KB: 건수·글자 수는 스키마를 통과하지만 바이트 상한을 넘는다
      const tooBig = Array.from({ length: 70 }, () => ({ text: 'a'.repeat(1000) }))
      const res = await post(session, 0, '/bulk', { items: tooBig }).expect(413)
      expect(res.body.code).toBe('PAYLOAD_TOO_LARGE')
      // 원문 txt 하나를 문구 하나로 밀어 넣는 경우(텍스트 상한 이전에 바이트 상한)
      await post(session, 0, '', { source: 'TXT', text: '가'.repeat(30_000) }).expect(413)
      // 기본 body-parser 상한(100KB)보다 큰 본문도 413
      await post(session, 0, '/bulk', {
        items: Array.from({ length: 200 }, () => ({ text: '가'.repeat(300) })),
      }).expect(413)
      expect(await prisma.quote.count()).toBe(0)

      const fits = Array.from({ length: 60 }, () => ({ text: 'a'.repeat(1000) }))
      await post(session, 0, '/bulk', { items: fits }).expect(201)
    })
  })

  describe('GET /quotes', () => {
    it('최신순 커서 페이지, 우리 커플 문구만, 업로드가 끝나지 않은 스크린샷은 빠진다', async () => {
      const session = await newCouple()
      const other = await newCouple()
      const { body: first } = await post(session, 0, '', { source: 'SHARE', text: '처음' }).expect(201)
      const { body: second } = await post(session, 1, '', { source: 'TXT', text: '두 번째' }).expect(201)
      await post(other, 0, '', { source: 'SHARE', text: '남의 문구' }).expect(201)
      await startScreenshot(session, fixture('no-exif.jpg'))

      const page1 = await list(session, '?limit=1', 1).expect(200)
      expect(page1.body.items.map((item: QuoteBody) => item.id)).toEqual([second.id])
      expect(page1.body.nextCursor).toBe(second.id)
      const page2 = await list(session, `?limit=1&cursor=${second.id}`).expect(200)
      expect(page2.body).toEqual({ items: [first], nextCursor: null })
      await list(session, `?cursor=${(await post(other, 0, '', { source: 'SHARE', text: 'x' })).body.id}`).expect(400)
    })
  })

  describe('GET·PATCH·DELETE /quotes/:id', () => {
    it('상세, 화자·메모 수정(null이면 비움)은 두 멤버 모두, 다른 커플 문구는 404', async () => {
      const session = await newCouple()
      const other = await newCouple()
      const { body: quote } = await post(session, 0, '', { source: 'SHARE', text: '사랑해', speakerLabel: 'A' }).expect(
        201,
      )
      const { body: theirs } = await post(other, 0, '', { source: 'SHARE', text: '남의 문구' }).expect(201)

      expect(
        (
          await http()
            .get(`${API}/${quote.id}`)
            .set(...bearer(session.tokens[1]))
            .expect(200)
        ).body,
      ).toEqual(quote)
      const patched = await http()
        .patch(`${API}/${quote.id}`)
        .set(...bearer(session.tokens[1]))
        .send({ speakerLabel: null, memo: '첫 데이트 날' })
        .expect(200)
      expect(patched.body).toMatchObject({ text: '사랑해', speakerLabel: null, memo: '첫 데이트 날' })

      await http()
        .get(`${API}/${theirs.id}`)
        .set(...bearer(session.tokens[0]))
        .expect(404)
      await http()
        .patch(`${API}/${theirs.id}`)
        .set(...bearer(session.tokens[0]))
        .send({ memo: '탈취' })
        .expect(404)
      await http()
        .delete(`${API}/${theirs.id}`)
        .set(...bearer(session.tokens[0]))
        .expect(404)
      expect(await prisma.quote.findFirst({ where: { id: theirs.id, coupleId: other.couple.id } })).toMatchObject({
        memo: null,
      })
    })

    it('스크린샷 문구를 지우면 행과 s.jpg·st.jpg·incoming 객체를 지운다', async () => {
      const session = await newCouple()
      const { quoteId } = await startScreenshot(session, fixture('gps-exif.jpg'))
      await complete(session, quoteId).expect(200)
      await http()
        .delete(`${API}/${quoteId}`)
        .set(...bearer(session.tokens[1]))
        .expect(204)

      expect(await prisma.quote.count({ where: { coupleId: session.couple.id } })).toBe(0)
      const keys = [quoteScreenshotKey, quoteScreenshotThumbKey, quoteScreenshotIncomingKey].map((toKey) =>
        toKey(session.couple.id, quoteId),
      )
      expect(await Promise.all(keys.map((key) => storage.head(key)))).toEqual([null, null, null])
    })
  })

  describe('스크린샷: POST /quotes/screenshots/uploads → PUT → POST /quotes/:id/screenshot/complete', () => {
    it('업로드 요청은 SCREENSHOT 문구(아직 목록에 없음) + incoming presigned PUT(300초, 크기 고정)', async () => {
      const session = await newCouple()
      const original = fixture('gps-exif.jpg')
      const { quoteId, body } = await startScreenshot(session, original)

      expect(body.expiresIn).toBe(300)
      expect(body.upload.url).toContain(quoteScreenshotIncomingKey(session.couple.id, quoteId))
      expect(expiresOf(body.upload.url)).toBe(300)
      expect(body.upload.headers).toEqual({ 'Content-Type': 'image/jpeg', 'Content-Length': String(original.length) })
      const row = await prisma.quote.findFirstOrThrow({ where: { id: quoteId, coupleId: session.couple.id } })
      expect(row).toMatchObject({
        source: 'SCREENSHOT',
        text: null,
        memo: '첫 고백',
        screenshotKey: quoteScreenshotKey(session.couple.id, quoteId),
        screenshotThumbKey: null,
      })
      await http()
        .get(`${API}/${quoteId}`)
        .set(...bearer(session.tokens[0]))
        .expect(404)
    })

    it('complete: 정제본 s.jpg·st.jpg만 남기고 incoming 삭제(EXIF·GPS 0), memory_created(type=quote), 다시 불러도 같은 결과', async () => {
      const session = await newCouple()
      const { quoteId } = await startScreenshot(session, fixture('gps-exif.jpg'))

      const res = await complete(session, quoteId, 1).expect(200)

      const coupleId = session.couple.id
      expect(res.body).toMatchObject({ id: quoteId, source: 'SCREENSHOT', text: null, memo: '첫 고백' })
      expect(res.body.screenshotUrl).toContain(quoteScreenshotKey(coupleId, quoteId))
      expect(res.body.screenshotThumbUrl).toContain(quoteScreenshotThumbKey(coupleId, quoteId))
      expect([expiresOf(res.body.screenshotUrl), expiresOf(res.body.screenshotThumbUrl)]).toEqual([3600, 3600])
      expect(await storage.head(quoteScreenshotIncomingKey(coupleId, quoteId))).toBeNull()
      expect(await storage.listKeys(`c/${coupleId}/q/${quoteId}/`)).toEqual(
        [quoteScreenshotKey(coupleId, quoteId), quoteScreenshotThumbKey(coupleId, quoteId)].sort(),
      )
      const [display, thumb] = await Promise.all([
        storage.getObject(quoteScreenshotKey(coupleId, quoteId)),
        storage.getObject(quoteScreenshotThumbKey(coupleId, quoteId)),
      ])
      if (!display || !thumb) throw new Error('정제본 없음')
      expect({
        displayExif: (await sharp(display).metadata()).exif === undefined,
        thumbExif: (await sharp(thumb).metadata()).exif === undefined,
        displayGps: await hasGps(display),
        thumbGps: await hasGps(thumb),
      }).toEqual({ displayExif: true, thumbExif: true, displayGps: false, thumbGps: false })
      expect((await eventsOf(session, 'memory_created')).map((event) => event.props)).toEqual([{ type: 'quote' }])

      const again = await complete(session, quoteId).expect(200)
      expect(again.body.id).toBe(quoteId)
      expect(await eventsOf(session, 'memory_created')).toHaveLength(1)
      expect((await list(session).expect(200)).body.items.map((item: QuoteBody) => item.id)).toEqual([quoteId])
    })

    it('PUT 전 complete는 409 UPLOAD_INCOMPLETE, 이미지가 아니면 422 INVALID_UPLOAD(incoming 남김 없이 미완료 유지)', async () => {
      const session = await newCouple()
      const { body } = await post(session, 0, '/screenshots/uploads', { mime: 'image/png', bytes: 10 }).expect(201)
      const res = await complete(session, body.quoteId).expect(409)
      expect(res.body.code).toBe('UPLOAD_INCOMPLETE')

      const { quoteId } = await startScreenshot(session, fixture('not-image.txt'))
      const invalid = await complete(session, quoteId).expect(422)
      expect(invalid.body.code).toBe('INVALID_UPLOAD')
      const row = await prisma.quote.findFirstOrThrow({ where: { id: quoteId, coupleId: session.couple.id } })
      expect(row.screenshotThumbKey).toBeNull()
    })

    it('스크린샷이 상한을 넘으면 422 INVALID_UPLOAD. 통째 읽기(getObject) 없이 상한+1바이트까지만 읽는다', async () => {
      const session = await newCouple()
      const { quoteId } = await startScreenshot(session, fixture('no-exif.jpg'))
      // 서명된 크기와 다르게 바꿔치기된 객체(HEAD 뒤 교체 포함)
      await storage.putObject({
        key: quoteScreenshotIncomingKey(session.couple.id, quoteId),
        body: Buffer.alloc(MAX_SCREENSHOT_BYTES + 1),
        contentType: 'image/jpeg',
      })
      const getObject = jest.spyOn(storage, 'getObject')
      const bounded = jest.spyOn(storage, 'getObjectBounded')
      expect((await complete(session, quoteId).expect(422)).body.code).toBe('INVALID_UPLOAD')
      expect(getObject).not.toHaveBeenCalled()
      expect(bounded).toHaveBeenCalledWith(quoteScreenshotIncomingKey(session.couple.id, quoteId), MAX_SCREENSHOT_BYTES)
      getObject.mockRestore()
      bounded.mockRestore()
    })

    it('세로로 긴 스크린샷(1290×8000)은 사진보다 큰 화소 상한으로 받는다', async () => {
      const tall = await sharp({ create: { width: 1290, height: 8000, channels: 3, background: '#fff' } })
        .jpeg({ quality: 10 })
        .toBuffer()
      const session = await newCouple()
      const { quoteId } = await startScreenshot(session, tall)
      await complete(session, quoteId).expect(200)
    })

    it('재인코딩 대기열이 가득 차면 스크린샷을 읽기 전에 503 BUSY', async () => {
      const session = await newCouple()
      const { quoteId } = await startScreenshot(session, fixture('no-exif.jpg'))
      const sanitizer = app.get(ImageSanitizer)
      let open: () => void = () => undefined
      const gate = new Promise<void>((resolve) => {
        open = resolve
      })
      const busy = Array.from({ length: 12 }, () =>
        sanitizer.sanitize(() => gate.then(() => fixture('no-exif.jpg')), PHOTO_MAX_INPUT_PIXELS),
      )
      const bounded = jest.spyOn(storage, 'getObjectBounded')
      expect((await complete(session, quoteId).expect(503)).body.code).toBe('BUSY')
      expect(bounded).not.toHaveBeenCalled()
      bounded.mockRestore()
      open()
      await Promise.all(busy)
      await complete(session, quoteId).expect(200)
    })

    it('screenshot/complete는 사용자당 1분에 60회, 넘으면 429 RATE_LIMITED', async () => {
      const session = await newCouple()
      const missing = '0199e3a0-0000-7000-8000-00000000fffe'
      for (let index = 0; index < 60; index += 1) {
        await complete(session, missing).expect(404)
      }
      expect((await complete(session, missing).expect(429)).body.code).toBe('RATE_LIMITED')
      await complete(session, missing, 1).expect(404)
    })

    it.each([
      ['지원하지 않는 형식', { mime: 'image/gif', bytes: 100 }],
      ['0바이트', { mime: 'image/jpeg', bytes: 0 }],
      ['상한 초과', { mime: 'image/jpeg', bytes: MAX_SCREENSHOT_BYTES + 1 }],
    ])('업로드 요청 %s → 400, 행 없음', async (_label, body) => {
      const session = await newCouple()
      await post(session, 0, '/screenshots/uploads', body).expect(400)
      expect(await prisma.quote.count()).toBe(0)
    })

    it('텍스트 문구에 screenshot/complete를 부르면 404, 다른 커플 스크린샷도 404(객체 무변경)', async () => {
      const session = await newCouple()
      const other = await newCouple()
      const { body: text } = await post(session, 0, '', { source: 'SHARE', text: '사랑해' }).expect(201)
      const { quoteId: theirs } = await startScreenshot(other, fixture('no-exif.jpg'))

      await complete(session, text.id).expect(404)
      await complete(session, theirs).expect(404)
      expect(await storage.head(quoteScreenshotIncomingKey(other.couple.id, theirs))).not.toBeNull()
      expect(await storage.head(quoteScreenshotKey(other.couple.id, theirs))).toBeNull()
    })
  })

  it('커플 purge는 문구 행과 스크린샷 객체(s.jpg·st.jpg·incoming)를 모두 지운다', async () => {
    const session = await newCouple()
    const done = await startScreenshot(session, fixture('gps-exif.jpg'))
    await complete(session, done.quoteId).expect(200)
    const pending = await startScreenshot(session, fixture('no-exif.jpg'))
    await prisma.couple.update({
      where: { id: session.couple.id },
      data: { status: 'UNLINKING', purgeAfter: new Date(Date.now() - 60_000) },
    })

    await expect(app.get(PurgeService).purgeDue()).resolves.toEqual({ purged: 1, failed: 0 })

    expect(await prisma.quote.count({ where: { coupleId: session.couple.id } })).toBe(0)
    const keys = [done.quoteId, pending.quoteId].flatMap((quoteId) =>
      [quoteScreenshotKey, quoteScreenshotThumbKey, quoteScreenshotIncomingKey].map((toKey) =>
        toKey(session.couple.id, quoteId),
      ),
    )
    expect((await Promise.all(keys.map((key) => storage.head(key)))).filter((head) => head !== null)).toEqual([])
  })
})
