import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { INestApplication } from '@nestjs/common'
import sharp from 'sharp'
import request from 'supertest'
import { PurgeService } from '../../src/couples/purge.service'
import { PUSH_SENDER } from '../../src/notifications/push.service'
import { PrismaService } from '../../src/prisma/prisma.service'
import { OBJECT_STORAGE, type ObjectStorage } from '../../src/storage/object-storage'
import {
  couplePrefixes,
  purgeLedgerKey,
  quoteScreenshotIncomingKey,
  quoteScreenshotKey,
  quoteScreenshotThumbKey,
} from '../../src/storage/storage-keys'
import { bearer } from '../integration/auth-helpers'
import { createCoupleSession } from '../integration/couple-session'
import { createFakePush } from '../integration/fake-push'
import { createTestApp } from '../integration/setup-app'
import { truncateAll } from '../integration/truncate'

const fixture = (name: string): Buffer => readFileSync(resolve(__dirname, '../fixtures', name))
const hasGps = async (body: Buffer): Promise<boolean> =>
  (await sharp(body).metadata()).exif?.includes(Buffer.from([0x25, 0x88])) === true

// 4B 체크포인트: 실제 S3 호환 저장소(SeaweedFS 9440)에 presigned PUT으로 스크린샷을 올리고 complete·purge 결과 객체를 검사한다
describe('문구 스크린샷 (실DB + S3 호환 저장소)', () => {
  let app: INestApplication
  let prisma: PrismaService
  let storage: ObjectStorage
  let cleanupPrefixes: readonly string[] = []

  beforeAll(async () => {
    app = await createTestApp((builder) => builder.overrideProvider(PUSH_SENDER).useValue(createFakePush().sender))
    prisma = app.get(PrismaService)
    storage = app.get<ObjectStorage>(OBJECT_STORAGE)
    await truncateAll(prisma)
  })

  afterAll(async () => {
    await Promise.all(cleanupPrefixes.map((prefix) => storage.deletePrefix(prefix)))
    await app.close()
  })

  it('presigned PUT → complete: s.jpg·st.jpg만 남고(GPS 0건) incoming 삭제, purge 후 객체 0건', async () => {
    const session = await createCoupleSession(app, prisma)
    const coupleId = session.couple.id
    cleanupPrefixes = couplePrefixes(coupleId)
    const screenshot = fixture('gps-exif.jpg')
    const http = () => request(app.getHttpServer())

    const { body: upload } = await http()
      .post('/api/v1/quotes/screenshots/uploads')
      .set(...bearer(session.tokens[0]))
      .send({ mime: 'image/jpeg', bytes: screenshot.length })
      .expect(201)
    const put = await fetch(upload.upload.url, {
      method: 'PUT',
      headers: upload.upload.headers,
      body: new Uint8Array(screenshot),
    })
    expect(put.status).toBe(200)

    await http()
      .post(`/api/v1/quotes/${upload.quoteId}/screenshot/complete`)
      .set(...bearer(session.tokens[1]))
      .expect(200)

    const quoteId = String(upload.quoteId)
    const [display, thumb] = await Promise.all([
      storage.getObject(quoteScreenshotKey(coupleId, quoteId)),
      storage.getObject(quoteScreenshotThumbKey(coupleId, quoteId)),
    ])
    if (!display || !thumb) throw new Error('정제본 없음')
    const evidence = {
      incomingLeft: (await storage.head(quoteScreenshotIncomingKey(coupleId, quoteId))) !== null,
      keys: await storage.listKeys(`c/${coupleId}/q/${quoteId}/`),
      displayHasGps: await hasGps(display),
      thumbHasGps: await hasGps(thumb),
      displayExif: (await sharp(display).metadata()).exif === undefined ? 'none' : 'present',
    }
    process.stdout.write(`quote screenshot evidence: ${JSON.stringify(evidence)}\n`)
    expect(evidence).toEqual({
      incomingLeft: false,
      keys: [quoteScreenshotKey(coupleId, quoteId), quoteScreenshotThumbKey(coupleId, quoteId)].sort(),
      displayHasGps: false,
      thumbHasGps: false,
      displayExif: 'none',
    })

    await prisma.couple.update({
      where: { id: coupleId },
      data: { status: 'UNLINKING', purgeAfter: new Date(Date.now() - 60_000) },
    })
    try {
      await expect(app.get(PurgeService).purgeDue()).resolves.toEqual({ purged: 1, failed: 0 })
      const remaining = await Promise.all(couplePrefixes(coupleId).map((prefix) => storage.listKeys(prefix)))
      expect(remaining.flat()).toEqual([])
    } finally {
      await storage.deleteObjects([purgeLedgerKey(coupleId)])
    }
  })
})
