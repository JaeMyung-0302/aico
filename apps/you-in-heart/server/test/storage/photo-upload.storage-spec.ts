import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { INestApplication } from '@nestjs/common'
import sharp from 'sharp'
import request from 'supertest'
import { PUSH_SENDER } from '../../src/notifications/push.service'
import { PrismaService } from '../../src/prisma/prisma.service'
import { OBJECT_STORAGE, type ObjectStorage } from '../../src/storage/object-storage'
import { couplePrefixes, photoDisplayKey, photoOriginalKey, photoThumbKey } from '../../src/storage/storage-keys'
import { bearer } from '../integration/auth-helpers'
import { createCoupleSession } from '../integration/couple-session'
import { createEntry } from '../integration/factories'
import { createFakePush } from '../integration/fake-push'
import { createTestApp } from '../integration/setup-app'
import { truncateAll } from '../integration/truncate'

const fixture = (name: string): Buffer => readFileSync(resolve(__dirname, '../fixtures', name))
const sha256 = (body: Buffer): string => createHash('sha256').update(body).digest('hex')
const hasGps = async (body: Buffer): Promise<boolean> =>
  (await sharp(body).metadata()).exif?.includes(Buffer.from([0x25, 0x88])) === true

type Target = { url: string; headers: Record<string, string> }
const putTo = (target: Target, body: Buffer) =>
  fetch(target.url, { method: 'PUT', headers: target.headers, body: new Uint8Array(body) })

// 1D 체크포인트: 실제 S3 호환 저장소(SeaweedFS 9440)에 presigned PUT으로 올리고 complete 결과 객체를 검사한다
describe('사진 업로드 (실DB + S3 호환 저장소)', () => {
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

  it('presigned PUT → complete: o는 바이트 그대로(GPS 유지), d.jpg·t.jpg는 GPS 0건, 원본 GET URL로 같은 바이트', async () => {
    const session = await createCoupleSession(app, prisma)
    const coupleId = session.couple.id
    cleanupPrefixes = couplePrefixes(coupleId)
    const entry = await createEntry(prisma, coupleId, session.members[0].id)
    const original = fixture('gps-exif.jpg')
    const http = () => request(app.getHttpServer())

    const { body: upload } = await http()
      .post('/api/v1/photos/uploads')
      .set(...bearer(session.tokens[0]))
      .send({ entryId: entry.id, originalMime: 'image/jpeg', originalBytes: original.length })
      .expect(201)
    expect((await putTo(upload.original, original)).status).toBe(200)
    expect((await putTo(upload.display, fixture('gps-exif.jpg'))).status).toBe(200)

    await http()
      .post(`/api/v1/photos/${upload.photoId}/complete`)
      .set(...bearer(session.tokens[0]))
      .expect(200)

    const [stored, display, thumb] = await Promise.all(
      [photoOriginalKey, photoDisplayKey, photoThumbKey].map((toKey) =>
        storage.getObject(toKey(coupleId, upload.photoId)),
      ),
    )
    if (!stored || !display || !thumb) throw new Error('객체 없음')
    const evidence = {
      originalSha256: sha256(stored),
      fixtureSha256: sha256(original),
      originalHasGps: await hasGps(stored),
      displayHasGps: await hasGps(display),
      thumbHasGps: await hasGps(thumb),
      displayExif: (await sharp(display).metadata()).exif === undefined ? 'none' : 'present',
    }
    process.stdout.write(`photo evidence: ${JSON.stringify(evidence)}\n`)
    expect(evidence).toEqual({
      originalSha256: evidence.fixtureSha256,
      fixtureSha256: sha256(original),
      originalHasGps: true,
      displayHasGps: false,
      thumbHasGps: false,
      displayExif: 'none',
    })

    const { body: signed } = await http()
      .get(`/api/v1/photos/${upload.photoId}/original`)
      .set(...bearer(session.tokens[1]))
      .expect(200)
    const downloaded = Buffer.from(await (await fetch(signed.url)).arrayBuffer())
    expect(sha256(downloaded)).toBe(sha256(original))
  })
})
