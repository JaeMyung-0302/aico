import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { INestApplication } from '@nestjs/common'
import { MAX_DISPLAY_CANDIDATE_BYTES, MAX_PHOTOS_PER_ENTRY } from '@you-in-heart/shared'
import sharp from 'sharp'
import request from 'supertest'
import { PUSH_SENDER } from '../../src/notifications/push.service'
import { ImageSanitizer, PHOTO_MAX_INPUT_PIXELS } from '../../src/photos/image-sanitizer'
import { PhotoCleanupCron } from '../../src/photos/photo-cleanup.cron'
import { PrismaService } from '../../src/prisma/prisma.service'
import { MemoryObjectStorage } from '../../src/storage/memory-object-storage'
import { OBJECT_STORAGE } from '../../src/storage/object-storage'
import { photoDisplayKey, photoIncomingKey, photoOriginalKey, photoThumbKey } from '../../src/storage/storage-keys'
import { bearer } from './auth-helpers'
import { createCoupleSession, type CoupleSession } from './couple-session'
import { createEntry, createPhoto } from './factories'
import { createFakePush } from './fake-push'
import { createTestApp } from './setup-app'
import { truncateAll } from './truncate'

const API = '/api/v1/photos'
// 기기가 만든 표시용 후보 JPEG의 바이트 수(요청에 넣지 않은 테스트의 기본값)
const DISPLAY_BYTES = 1000
const fixture = (name: string): Buffer => readFileSync(resolve(__dirname, '../fixtures', name))
const sha256 = (body: Buffer): string => createHash('sha256').update(body).digest('hex')
const expiresOf = (url: string): number => Number(new URL(url).searchParams.get('X-Amz-Expires'))
// GPS IFD 포인터 태그(0x8825)가 EXIF 안에 있는지(exiftool 없이 sharp 메타데이터로 확인)
const hasGps = async (body: Buffer): Promise<boolean> =>
  (await sharp(body).metadata()).exif?.includes(Buffer.from([0x25, 0x88])) === true

describe('사진 파이프라인 (실DB + 메모리 스토리지)', () => {
  let app: INestApplication
  let prisma: PrismaService
  let storage: MemoryObjectStorage

  const http = () => request(app.getHttpServer())
  const newCouple = (overrides: Parameters<typeof createCoupleSession>[2] = {}) =>
    createCoupleSession(app, prisma, overrides)
  const grantLocation = (userId: string) =>
    prisma.consent.create({ data: { userId, kind: 'LOCATION', version: 'test' } })
  const upload = (session: CoupleSession, who: 0 | 1, body: object) =>
    http()
      .post(`${API}/uploads`)
      .set(...bearer(session.tokens[who]))
      .send({ displayBytes: DISPLAY_BYTES, ...body })
  const complete = (token: string, photoId: string) =>
    http()
      .post(`${API}/${photoId}/complete`)
      .set(...bearer(token))
  // 앱의 presigned PUT 2개를 흉내 낸다(원본 → o, 표시용 후보 → incoming)
  const putUploads = async (coupleId: string, photoId: string, original: Buffer, display: Buffer) => {
    await storage.putObject({ key: photoOriginalKey(coupleId, photoId), body: original, contentType: 'image/jpeg' })
    await storage.putObject({ key: photoIncomingKey(coupleId, photoId), body: display, contentType: 'image/jpeg' })
  }
  const startUpload = async (session: CoupleSession, original: Buffer, extra: object = {}) => {
    const entry = await createEntry(prisma, session.couple.id, session.members[0].id)
    const res = await upload(session, 0, {
      entryId: entry.id,
      originalMime: 'image/jpeg',
      originalBytes: original.length,
      ...extra,
    }).expect(201)
    return { entry, photoId: String(res.body.photoId), body: res.body }
  }

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
    jest.restoreAllMocks()
  })

  afterAll(async () => {
    await app.close()
  })

  describe('POST /photos/uploads', () => {
    it('PENDING 행 + presigned PUT 2개(300초), 업로더는 요청 멤버, 좌표는 위치 동의가 있을 때만 저장', async () => {
      const session = await newCouple()
      await grantLocation(session.members[0].id)
      const original = fixture('gps-exif.jpg')
      const { photoId, body } = await startUpload(session, original, {
        takenAt: '2026-10-01T09:30:00+09:00',
        lat: 37.5665,
        lng: 126.978,
      })
      expect(body.expiresIn).toBe(300)
      expect([expiresOf(body.original.url), expiresOf(body.display.url)]).toEqual([300, 300])
      expect(body.original.url).toContain(photoOriginalKey(session.couple.id, photoId))
      expect(body.display.url).toContain(photoIncomingKey(session.couple.id, photoId))
      expect(body.original.headers).toEqual({
        'Content-Type': 'image/jpeg',
        'Content-Length': String(original.length),
      })
      expect(body.display.headers).toEqual({ 'Content-Type': 'image/jpeg', 'Content-Length': String(DISPLAY_BYTES) })
      const row = await prisma.photo.findFirstOrThrow({ where: { id: photoId } })
      expect(row).toMatchObject({ status: 'PENDING', uploaderId: session.members[0].id, lat: 37.5665, lng: 126.978 })
      expect(row.takenAt?.toISOString()).toBe('2026-10-01T00:30:00.000Z')
    })

    it('위치 동의가 없으면 좌표가 있을 때만 403 LOCATION_CONSENT_REQUIRED, 좌표가 없으면 201', async () => {
      const session = await newCouple()
      const entry = await createEntry(prisma, session.couple.id, session.members[0].id)
      const base = { entryId: entry.id, originalMime: 'image/jpeg', originalBytes: 100 }
      const res = await upload(session, 0, { ...base, lat: 37.5, lng: 127 }).expect(403)
      expect(res.body.code).toBe('LOCATION_CONSENT_REQUIRED')
      await upload(session, 0, base).expect(201)
      expect(await prisma.photo.count({ where: { lat: { not: null } } })).toBe(0)
    })

    it(`엔트리당 ${MAX_PHOTOS_PER_ENTRY}장: ${MAX_PHOTOS_PER_ENTRY + 1}번째는 400`, async () => {
      const session = await newCouple()
      const entry = await createEntry(prisma, session.couple.id, session.members[0].id)
      for (let index = 0; index < MAX_PHOTOS_PER_ENTRY; index += 1) {
        await createPhoto(prisma, session.couple.id, entry.id, session.members[0].id)
      }
      await upload(session, 0, { entryId: entry.id, originalMime: 'image/jpeg', originalBytes: 100 }).expect(400)
    })

    it.each([
      ['lat 범위 밖', { lat: 90.1, lng: 127 }],
      ['lng 범위 밖', { lat: 37, lng: -180.5 }],
      ['lat만', { lat: 37 }],
      ['미래 takenAt', { takenAt: new Date(Date.now() + 86_400_000).toISOString() }],
      ['지원하지 않는 형식', { originalMime: 'image/gif' }],
      ['0바이트', { originalBytes: 0 }],
      ['200MB 초과', { originalBytes: 200 * 1024 * 1024 + 1 }],
      ['displayBytes 0', { displayBytes: 0 }],
      ['displayBytes 상한 초과', { displayBytes: MAX_DISPLAY_CANDIDATE_BYTES + 1 }],
      ['displayBytes 없음', { displayBytes: undefined }],
    ])('%s → 400', async (_label, extra) => {
      const session = await newCouple()
      await grantLocation(session.members[0].id)
      const entry = await createEntry(prisma, session.couple.id, session.members[0].id)
      await upload(session, 0, { entryId: entry.id, originalMime: 'image/jpeg', originalBytes: 100, ...extra }).expect(
        400,
      )
    })

    it('표시용 후보 PUT도 displayBytes를 Content-Length로 서명한다', async () => {
      const session = await newCouple()
      const presignPut = jest.spyOn(storage, 'presignPut')
      const { photoId } = await startUpload(session, fixture('gps-exif.jpg'), { displayBytes: 4321 })
      expect(presignPut).toHaveBeenCalledWith({
        key: photoIncomingKey(session.couple.id, photoId),
        contentType: 'image/jpeg',
        contentLength: 4321,
        expiresIn: 300,
      })
    })

    it('다른 커플의 entryId는 404(presign 0회), 상대의 일반 일기는 403, 상대의 AUTO_DAY에는 올릴 수 있다', async () => {
      const session = await newCouple()
      const other = await newCouple()
      const presignPut = jest.spyOn(storage, 'presignPut')
      const theirs = await createEntry(prisma, other.couple.id, other.members[0].id)
      const partners = await createEntry(prisma, session.couple.id, session.members[1].id)
      const autoDay = await createEntry(prisma, session.couple.id, session.members[1].id, { kind: 'AUTO_DAY' })
      const body = (entryId: string) => ({ entryId, originalMime: 'image/jpeg', originalBytes: 100 })
      await upload(session, 0, body(theirs.id)).expect(404)
      expect(presignPut).not.toHaveBeenCalled()
      expect((await upload(session, 0, body(partners.id)).expect(403)).body.code).toBe('NOT_AUTHOR')
      await upload(session, 0, body(autoDay.id)).expect(201)
    })

    it('연결 해제 유예 중에는 409(새 presigned 업로드 거부)', async () => {
      const session = await newCouple({ status: 'UNLINKING', purgeAfter: new Date(Date.now() - 60_000) })
      const entry = await createEntry(prisma, session.couple.id, session.members[0].id)
      await upload(session, 0, { entryId: entry.id, originalMime: 'image/jpeg', originalBytes: 100 }).expect(409)
    })
  })

  describe('POST /photos/:id/complete', () => {
    it('원본은 바이트 그대로(SHA-256 동일, GPS 유지), d.jpg·t.jpg는 EXIF 없음, incoming 삭제, READY', async () => {
      const session = await newCouple()
      const original = fixture('gps-exif.jpg')
      const { photoId } = await startUpload(session, original)
      const coupleId = session.couple.id
      await putUploads(coupleId, photoId, original, fixture('gps-exif.jpg'))

      const res = await complete(session.tokens[0], photoId).expect(200)
      expect(res.body).toMatchObject({ id: photoId, status: 'READY', width: expect.any(Number), height: 2048 })
      expect([expiresOf(res.body.thumbUrl), expiresOf(res.body.displayUrl)]).toEqual([3600, 3600])

      const stored = await storage.getObject(photoOriginalKey(coupleId, photoId))
      if (!stored) throw new Error('원본 없음')
      expect(sha256(stored)).toBe(sha256(original))
      expect(await hasGps(stored)).toBe(true)
      const [display, thumb] = await Promise.all([
        storage.getObject(photoDisplayKey(coupleId, photoId)),
        storage.getObject(photoThumbKey(coupleId, photoId)),
      ])
      if (!display || !thumb) throw new Error('표시용·썸네일 없음')
      expect((await sharp(display).metadata()).exif).toBeUndefined()
      expect((await sharp(thumb).metadata()).exif).toBeUndefined()
      expect(await hasGps(display)).toBe(false)
      expect(await storage.head(photoIncomingKey(coupleId, photoId))).toBeNull()
      const row = await prisma.photo.findFirstOrThrow({ where: { id: photoId } })
      expect(row).toMatchObject({
        status: 'READY',
        displayKey: photoDisplayKey(coupleId, photoId),
        thumbKey: photoThumbKey(coupleId, photoId),
      })
      // 다시 불러도 같은 결과(멱등)
      await complete(session.tokens[0], photoId).expect(200)
    })

    it('HEIC 원본(ftypheic)은 매직 넘버만 보고 받는다(표시용은 기기가 만든 JPEG)', async () => {
      const session = await newCouple()
      const heic = fixture('sample.heic')
      const entry = await createEntry(prisma, session.couple.id, session.members[0].id)
      const res = await upload(session, 0, {
        entryId: entry.id,
        originalMime: 'image/heic',
        originalBytes: heic.length,
      }).expect(201)
      await putUploads(session.couple.id, res.body.photoId, heic, fixture('no-exif.jpg'))
      await complete(session.tokens[0], res.body.photoId).expect(200)
    })

    it.each([
      ['원본 매직 넘버가 이미지가 아님', 'not-image.txt', 'gps-exif.jpg', 'image/jpeg'],
      ['선언한 형식과 매직 넘버가 다름', 'gps-exif.jpg', 'gps-exif.jpg', 'image/png'],
      ['표시용 후보가 HEIC(서버는 디코딩 안 함)', 'gps-exif.jpg', 'sample.heic', 'image/jpeg'],
    ])('%s → 422, PENDING 유지', async (_label, originalName, displayName, mime) => {
      const session = await newCouple()
      const original = fixture(originalName)
      const entry = await createEntry(prisma, session.couple.id, session.members[0].id)
      const res = await upload(session, 0, {
        entryId: entry.id,
        originalMime: mime,
        originalBytes: original.length,
      }).expect(201)
      await putUploads(session.couple.id, res.body.photoId, original, fixture(displayName))
      await complete(session.tokens[0], res.body.photoId).expect(422)
      expect((await prisma.photo.findFirstOrThrow({ where: { id: res.body.photoId } })).status).toBe('PENDING')
    })

    it('올린 사람이 아니면 403 NOT_AUTHOR(PENDING 유지), 올린 사람은 200', async () => {
      const session = await newCouple()
      const original = fixture('gps-exif.jpg')
      const { photoId } = await startUpload(session, original)
      await putUploads(session.couple.id, photoId, original, fixture('no-exif.jpg'))
      expect((await complete(session.tokens[1], photoId).expect(403)).body.code).toBe('NOT_AUTHOR')
      expect((await prisma.photo.findFirstOrThrow({ where: { id: photoId } })).status).toBe('PENDING')
      await complete(session.tokens[0], photoId).expect(200)
    })

    it('표시용 후보가 상한을 넘으면 422 INVALID_UPLOAD. 통째 읽기(getObject) 없이 상한+1바이트까지만 읽는다', async () => {
      const session = await newCouple()
      const original = fixture('gps-exif.jpg')
      const { photoId } = await startUpload(session, original)
      await putUploads(session.couple.id, photoId, original, Buffer.alloc(MAX_DISPLAY_CANDIDATE_BYTES + 1))
      const getObject = jest.spyOn(storage, 'getObject')
      const bounded = jest.spyOn(storage, 'getObjectBounded')
      expect((await complete(session.tokens[0], photoId).expect(422)).body.code).toBe('INVALID_UPLOAD')
      expect(getObject).not.toHaveBeenCalled()
      expect(bounded).toHaveBeenCalledWith(photoIncomingKey(session.couple.id, photoId), MAX_DISPLAY_CANDIDATE_BYTES)
    })

    it('재인코딩 대기열이 가득 차면 표시용 후보를 읽기 전에 503 BUSY', async () => {
      const session = await newCouple()
      const original = fixture('gps-exif.jpg')
      const { photoId } = await startUpload(session, original)
      await putUploads(session.couple.id, photoId, original, fixture('no-exif.jpg'))
      const sanitizer = app.get(ImageSanitizer)
      let open: () => void = () => undefined
      const gate = new Promise<void>((resolve) => {
        open = resolve
      })
      const busy = Array.from({ length: 12 }, () =>
        sanitizer.sanitize(() => gate.then(() => fixture('no-exif.jpg')), PHOTO_MAX_INPUT_PIXELS),
      )
      const bounded = jest.spyOn(storage, 'getObjectBounded')
      expect((await complete(session.tokens[0], photoId).expect(503)).body.code).toBe('BUSY')
      expect(bounded).not.toHaveBeenCalled()
      open()
      await Promise.all(busy)
      await complete(session.tokens[0], photoId).expect(200)
    })

    it('사용자당 1분에 60회, 넘으면 429 RATE_LIMITED', async () => {
      const session = await newCouple()
      const missing = '0199e3a0-0000-7000-8000-00000000fffe'
      for (let index = 0; index < 60; index += 1) {
        await complete(session.tokens[0], missing).expect(404)
      }
      expect((await complete(session.tokens[0], missing).expect(429)).body.code).toBe('RATE_LIMITED')
      await complete(session.tokens[1], missing).expect(404)
    })

    it('원본 크기가 선언과 다르면 422, 아직 올리지 않았으면 409', async () => {
      const session = await newCouple()
      const original = fixture('gps-exif.jpg')
      const { photoId } = await startUpload(session, original)
      await complete(session.tokens[0], photoId).expect(409)
      await putUploads(session.couple.id, photoId, original.subarray(0, 100), fixture('no-exif.jpg'))
      await complete(session.tokens[0], photoId).expect(422)
    })
  })

  describe('POST /photos/:id/uploads/renew', () => {
    const renew = (token: string, photoId: string, body: object = { displayBytes: DISPLAY_BYTES }) =>
      http()
        .post(`${API}/${photoId}/uploads/renew`)
        .set(...bearer(token))
        .send(body)

    it('내 PENDING 사진: 같은 photoId로 새 300초 PUT URL 2개, 원본 헤더는 저장된 mime·바이트 수, 표시용은 새 displayBytes', async () => {
      const session = await newCouple()
      const heic = fixture('sample.heic')
      const { photoId } = await startUpload(session, heic, { originalMime: 'image/heic' })
      const res = await renew(session.tokens[0], photoId, { displayBytes: 2048 }).expect(200)
      expect(res.body).toEqual({
        photoId,
        original: {
          url: expect.stringContaining(photoOriginalKey(session.couple.id, photoId)),
          headers: { 'Content-Type': 'image/heic', 'Content-Length': String(heic.length) },
        },
        display: {
          url: expect.stringContaining(photoIncomingKey(session.couple.id, photoId)),
          headers: { 'Content-Type': 'image/jpeg', 'Content-Length': '2048' },
        },
        expiresIn: 300,
      })
      expect([expiresOf(res.body.original.url), expiresOf(res.body.display.url)]).toEqual([300, 300])
      // 새 URL로 올린 뒤 complete가 그대로 이어진다
      await putUploads(session.couple.id, photoId, heic, fixture('no-exif.jpg'))
      await complete(session.tokens[0], photoId).expect(200)
    })

    it.each([
      ['본문 없음', {}],
      ['displayBytes 0', { displayBytes: 0 }],
      ['displayBytes 상한 초과', { displayBytes: MAX_DISPLAY_CANDIDATE_BYTES + 1 }],
    ])('renew %s → 400', async (_label, body) => {
      const session = await newCouple()
      const { photoId } = await startUpload(session, fixture('gps-exif.jpg'))
      await renew(session.tokens[0], photoId, body).expect(400)
    })

    it('READY는 409 ALREADY_COMPLETE, 상대가 올린 PENDING은 403 NOT_AUTHOR, 없는 id는 404', async () => {
      const session = await newCouple()
      const original = fixture('gps-exif.jpg')
      const { photoId, entry } = await startUpload(session, original)
      await putUploads(session.couple.id, photoId, original, fixture('no-exif.jpg'))
      await complete(session.tokens[0], photoId).expect(200)
      expect((await renew(session.tokens[0], photoId).expect(409)).body.code).toBe('ALREADY_COMPLETE')
      const pending = await createPhoto(prisma, session.couple.id, entry.id, session.members[0].id)
      expect((await renew(session.tokens[1], pending.id).expect(403)).body.code).toBe('NOT_AUTHOR')
      await renew(session.tokens[0], '0199e3a0-0000-7000-8000-00000000ffff').expect(404)
    })

    it('다른 커플의 photoId는 404이고 presign 호출 0회', async () => {
      const session = await newCouple()
      const other = await newCouple()
      const { photoId } = await startUpload(other, fixture('gps-exif.jpg'))
      const presignPut = jest.spyOn(storage, 'presignPut')
      await renew(session.tokens[0], photoId).expect(404)
      expect(presignPut).not.toHaveBeenCalled()
    })

    it('연결 해제 유예 중에는 409 COUPLE_UNLINKING', async () => {
      const session = await newCouple()
      const { photoId } = await startUpload(session, fixture('gps-exif.jpg'))
      await prisma.couple.update({
        where: { id: session.couple.id },
        data: { status: 'UNLINKING', purgeAfter: new Date(Date.now() + 86_400_000) },
      })
      expect((await renew(session.tokens[0], photoId).expect(409)).body.code).toBe('COUPLE_UNLINKING')
    })
  })

  describe('조회와 원본 URL', () => {
    const readyPhoto = async (session: CoupleSession) => {
      const original = fixture('gps-exif.jpg')
      const { photoId, entry } = await startUpload(session, original)
      await putUploads(session.couple.id, photoId, original, fixture('no-exif.jpg'))
      await complete(session.tokens[0], photoId).expect(200)
      return { photoId, entryId: entry.id }
    }

    it('GET /photos·GET /photos/:id·GET /diary/:id에는 원본 URL·좌표가 없고 썸네일·표시용 URL은 3600초', async () => {
      const session = await newCouple()
      const { photoId, entryId } = await readyPhoto(session)
      await createPhoto(prisma, session.couple.id, entryId, session.members[0].id)
      const originalPath = `/p/${photoId}/o`
      const responses = await Promise.all(
        [API, `${API}/${photoId}`, `/api/v1/diary/${entryId}`].map((path) =>
          http()
            .get(path)
            .set(...bearer(session.tokens[1]))
            .expect(200),
        ),
      )
      const [list, single, entry] = responses.map((res) => res.body)
      expect(list.items.map((photo: { id: string }) => photo.id)).toEqual([photoId])
      expect(entry.photos.map((photo: { id: string }) => photo.id)).toEqual([photoId])
      for (const photo of [list.items[0], single, entry.photos[0]]) {
        expect([expiresOf(photo.thumbUrl), expiresOf(photo.displayUrl)]).toEqual([3600, 3600])
      }
      responses.forEach((res) => {
        expect(JSON.stringify(res.body)).not.toContain(originalPath)
        expect(JSON.stringify(res.body)).not.toMatch(/"(lat|lng)"/)
      })
    })

    it('GET /photos/:id/original만 300초 원본 URL을 준다', async () => {
      const session = await newCouple()
      const { photoId } = await readyPhoto(session)
      const res = await http()
        .get(`${API}/${photoId}/original`)
        .set(...bearer(session.tokens[1]))
        .expect(200)
      expect(res.body.expiresIn).toBe(300)
      expect(expiresOf(res.body.url)).toBe(300)
      expect(res.body.url).toContain(photoOriginalKey(session.couple.id, photoId))
      expect(res.body.mime).toBe('image/jpeg')
    })

    it('커플 B photoId로 complete·original을 부르면 404이고 presign 호출 0회', async () => {
      const session = await newCouple()
      const other = await newCouple()
      const { photoId } = await readyPhoto(other)
      const presignGet = jest.spyOn(storage, 'presignGet')
      await complete(session.tokens[0], photoId).expect(404)
      await http()
        .get(`${API}/${photoId}/original`)
        .set(...bearer(session.tokens[0]))
        .expect(404)
      expect(presignGet).not.toHaveBeenCalled()
    })

    it('GET /photos는 takenAt desc(없으면 뒤로), id desc 커서', async () => {
      const session = await newCouple()
      const entry = await createEntry(prisma, session.couple.id, session.members[0].id)
      const make = async (takenAt: Date | null) => {
        const photo = await createPhoto(prisma, session.couple.id, entry.id, session.members[0].id)
        await prisma.photo.update({ where: { id: photo.id }, data: { status: 'READY', takenAt } })
        return photo.id
      }
      const ids = [await make(null), await make(new Date('2026-01-01')), await make(new Date('2026-05-01'))]
      const page = (cursor?: string) =>
        http()
          .get(`${API}?limit=2${cursor ? `&cursor=${cursor}` : ''}`)
          .set(...bearer(session.tokens[0]))
          .expect(200)
      const first = await page()
      expect(first.body.items.map((photo: { id: string }) => photo.id)).toEqual([ids[2], ids[1]])
      const second = await page(first.body.nextCursor)
      expect(second.body.items.map((photo: { id: string }) => photo.id)).toEqual([ids[0]])
      expect(second.body.nextCursor).toBeNull()
    })
  })

  it('photo-cleanup: 24시간 지난 PENDING 행과 원본·incoming 객체만 지운다(READY·최근 PENDING은 그대로)', async () => {
    const session = await newCouple()
    const entry = await createEntry(prisma, session.couple.id, session.members[0].id)
    const old = new Date(Date.now() - 25 * 3_600_000)
    const [stale, ready, fresh] = await Promise.all(
      [1, 2, 3].map(() => createPhoto(prisma, session.couple.id, entry.id, session.members[0].id)),
    )
    if (!stale || !ready || !fresh) throw new Error('사진 생성 실패')
    await prisma.photo.update({ where: { id: stale.id }, data: { createdAt: old } })
    await prisma.photo.update({ where: { id: ready.id }, data: { createdAt: old, status: 'READY' } })
    await Promise.all(
      [stale, ready, fresh].map(({ id }) => putUploads(session.couple.id, id, Buffer.from('o'), Buffer.from('in'))),
    )
    await app.get(PhotoCleanupCron).run()
    expect((await prisma.photo.findMany({ select: { id: true } })).map(({ id }) => id).sort()).toEqual(
      [ready.id, fresh.id].sort(),
    )
    expect(await storage.head(photoOriginalKey(session.couple.id, stale.id))).toBeNull()
    expect(await storage.head(photoIncomingKey(session.couple.id, stale.id))).toBeNull()
    expect(await storage.head(photoOriginalKey(session.couple.id, ready.id))).not.toBeNull()
    expect(await storage.head(photoOriginalKey(session.couple.id, fresh.id))).not.toBeNull()
  })
})
