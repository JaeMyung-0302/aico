import { createHash, randomBytes } from 'node:crypto'
import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { PUSH_SENDER } from '../../src/notifications/push.service'
import { PrismaService } from '../../src/prisma/prisma.service'
import { OBJECT_STORAGE, type ObjectStorage } from '../../src/storage/object-storage'
import { couplePrefixes } from '../../src/storage/storage-keys'
import { readZip } from '../helpers/read-zip'
import { bearer } from '../integration/auth-helpers'
import { createCoupleSession } from '../integration/couple-session'
import { createEntry, createPhoto } from '../integration/factories'
import { createFakePush } from '../integration/fake-push'
import { createTestApp } from '../integration/setup-app'
import { truncateAll } from '../integration/truncate'

const MB = 1024 * 1024
const sha256 = (body: Buffer): string => createHash('sha256').update(body).digest('hex')

// 실제 S3 호환 저장소(SeaweedFS 9440): 원본 스트림 읽기 + lib-storage 멀티파트 업로드(파트 8MB) + 24시간 서명 URL 다운로드
describe('내보내기 (실DB + S3 호환 저장소)', () => {
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

  it('20MB 원본을 담은 zip을 멀티파트로 올리고, 서명 URL로 받은 zip의 원본 SHA-256이 같다', async () => {
    const session = await createCoupleSession(app, prisma)
    cleanupPrefixes = couplePrefixes(session.couple.id)
    const entry = await createEntry(prisma, session.couple.id, session.members[0].id, {
      happenedOn: new Date('2026-09-01'),
    })
    const photo = await createPhoto(prisma, session.couple.id, entry.id, session.members[0].id)
    await prisma.photo.update({ where: { id: photo.id }, data: { status: 'READY' } })
    const original = randomBytes(20 * MB)
    await storage.putObject({ key: photo.originalKey, body: original, contentType: 'image/jpeg' })

    const http = () => request(app.getHttpServer())
    const { body: job } = await http()
      .post('/api/v1/export')
      .set(...bearer(session.tokens[0]))
      .expect(202)
    const poll = async (attempt: number): Promise<{ status: string; downloadUrl: string | null }> => {
      const { body } = await http()
        .get(`/api/v1/export/${job.id}`)
        .set(...bearer(session.tokens[0]))
        .expect(200)
      if (body.status === 'READY' || body.status === 'FAILED' || attempt >= 200) return body
      await new Promise((resolve) => setTimeout(resolve, 100))
      return poll(attempt + 1)
    }
    const done = await poll(0)
    expect(done.status).toBe('READY')

    const zip = Buffer.from(await (await fetch(done.downloadUrl ?? '')).arrayBuffer())
    const files = readZip(zip)
    expect(sha256(files.get(`photos/2026-09-01/${photo.id}.jpg`) ?? Buffer.alloc(0))).toBe(sha256(original))
    expect(files.has('entries.json')).toBe(true)
  })
})
