import { createHash } from 'node:crypto'
import type { INestApplication } from '@nestjs/common'
import { exportManifestV1Schema } from '@you-in-heart/shared'
import request from 'supertest'
import { PUSH_SENDER } from '../../src/notifications/push.service'
import { PrismaService } from '../../src/prisma/prisma.service'
import { MemoryObjectStorage } from '../../src/storage/memory-object-storage'
import { OBJECT_STORAGE } from '../../src/storage/object-storage'
import { exportZipKey } from '../../src/storage/storage-keys'
import { readZip } from '../helpers/read-zip'
import { bearer } from './auth-helpers'
import { createCoupleSession, type CoupleSession } from './couple-session'
import { createEntry, createPhoto } from './factories'
import { createFakePush, type FakePush } from './fake-push'
import { createTestApp } from './setup-app'
import { truncateAll } from './truncate'

const API = '/api/v1/export'
const DAY_S = 86_400
const sha256 = (body: Buffer): string => createHash('sha256').update(body).digest('hex')
const expiresOf = (url: string): number => Number(new URL(url).searchParams.get('X-Amz-Expires'))

type JobBody = { id: string; status: string; downloadUrl: string | null; expiresAt: string | null; createdAt: string }

describe('내보내기 (실DB + 메모리 스토리지)', () => {
  let app: INestApplication
  let prisma: PrismaService
  let storage: MemoryObjectStorage
  let push: FakePush

  const http = () => request(app.getHttpServer())
  const newCouple = (overrides: Parameters<typeof createCoupleSession>[2] = {}) =>
    createCoupleSession(app, prisma, overrides)
  const requestExport = (session: CoupleSession, who: 0 | 1 = 0) =>
    http()
      .post(API)
      .set(...bearer(session.tokens[who]))
  const getJob = (session: CoupleSession, jobId: string) =>
    http()
      .get(`${API}/${jobId}`)
      .set(...bearer(session.tokens[0]))
  // 처리는 요청 뒤 백그라운드에서 돈다 → READY·FAILED가 될 때까지 짧게 폴링
  const waitDone = async (session: CoupleSession, jobId: string): Promise<JobBody> => {
    const poll = async (attempt: number): Promise<JobBody> => {
      const { body } = await getJob(session, jobId).expect(200)
      if (body.status === 'READY' || body.status === 'FAILED' || attempt >= 100) return body
      await new Promise((resolve) => setTimeout(resolve, 50))
      return poll(attempt + 1)
    }
    return poll(0)
  }

  // 일기 2개(사진 READY 2장 + PENDING 1장), 기념일·장소·버킷·문구 각 1개
  const seedMemories = async (session: CoupleSession) => {
    const coupleId = session.couple.id
    const [first, second] = session.members
    const place = await prisma.place.create({
      data: { coupleId, name: '한강', lat: 37.5, lng: 127, createdById: first.id },
    })
    const entryA = await createEntry(prisma, coupleId, first.id, {
      happenedOn: new Date('2026-09-01'),
      placeId: place.id,
    })
    const entryB = await createEntry(prisma, coupleId, second.id, {
      happenedOn: new Date('2026-10-02'),
      body: '두 번째',
    })
    const ready = await Promise.all(
      [
        [entryA.id, 'image/jpeg', 'jpeg-bytes-A'],
        [entryB.id, 'image/heic', 'heic-bytes-B'],
      ].map(async ([entryId = '', mime = '', bytes = '']) => {
        const photo = await createPhoto(prisma, coupleId, entryId, first.id)
        await prisma.photo.update({ where: { id: photo.id }, data: { status: 'READY', originalMime: mime } })
        await storage.putObject({ key: photo.originalKey, body: Buffer.from(bytes), contentType: mime })
        return { ...photo, body: Buffer.from(bytes) }
      }),
    )
    await createPhoto(prisma, coupleId, entryB.id, first.id)
    await prisma.anniversary.create({ data: { coupleId, title: '첫 여행', date: new Date('2025-05-05') } })
    await prisma.bucketItem.create({ data: { coupleId, title: '제주 가기', entryId: entryA.id } })
    await prisma.quote.create({ data: { coupleId, source: 'SHARE', text: '보고 싶어', speakerLabel: '나' } })
    return { entryA, entryB, ready }
  }

  beforeAll(async () => {
    storage = new MemoryObjectStorage()
    push = createFakePush()
    app = await createTestApp((builder) =>
      builder.overrideProvider(PUSH_SENDER).useValue(push.sender).overrideProvider(OBJECT_STORAGE).useValue(storage),
    )
    prisma = app.get(PrismaService)
  })

  beforeEach(async () => {
    await truncateAll(prisma)
    storage.clear()
    push.reset()
  })

  afterAll(async () => {
    await app.close()
  })

  it('POST /export → 202 PENDING, 처리 후 READY: zip(entries.json + photos/{happenedOn}/{photoId}.{ext} 원본) + 24시간 동안 받을 수 있는 10분 URL + 요청자 푸시', async () => {
    const session = await newCouple()
    await prisma.pushToken.create({
      data: { userId: session.members[0].id, expoToken: 'ExponentPushToken[requester]', platform: 'IOS' },
    })
    const { ready, entryA, entryB } = await seedMemories(session)

    const res = await requestExport(session).expect(202)
    expect(res.body).toMatchObject({ id: expect.any(String), downloadUrl: null, expiresAt: null })
    const done = await waitDone(session, res.body.id)
    expect(done.status).toBe('READY')
    expect(done.downloadUrl).toContain(exportZipKey(session.couple.id, res.body.id))
    expect(expiresOf(done.downloadUrl ?? '')).toBe(600)
    expect(Date.parse(done.expiresAt ?? '') - Date.now()).toBeGreaterThan((DAY_S - 60) * 1000)

    const zip = await storage.getObject(exportZipKey(session.couple.id, res.body.id))
    if (!zip) throw new Error('zip 없음')
    const files = readZip(zip)
    const [photoA, photoB] = ready
    if (!photoA || !photoB) throw new Error('사진 없음')
    const pathA = `photos/2026-09-01/${photoA.id}.jpg`
    const pathB = `photos/2026-10-02/${photoB.id}.heic`
    expect([...files.keys()].sort()).toEqual(['entries.json', pathA, pathB].sort())
    expect(sha256(files.get(pathA) ?? Buffer.alloc(0))).toBe(sha256(photoA.body))
    expect(sha256(files.get(pathB) ?? Buffer.alloc(0))).toBe(sha256(photoB.body))

    const manifest = exportManifestV1Schema.parse(JSON.parse(files.get('entries.json')?.toString('utf8') ?? '{}'))
    expect(manifest.diary.map((entry) => entry.id)).toEqual([entryA.id, entryB.id])
    expect(manifest.diary[0]?.photos).toEqual([{ id: photoA.id, path: pathA, takenAt: null }])
    expect([
      manifest.anniversaries.length,
      manifest.places.length,
      manifest.bucket.length,
      manifest.quotes.length,
    ]).toEqual([1, 1, 1, 1])
    expect(manifest.anniversaries[0]).toMatchObject({ kind: 'CUSTOM', title: '첫 여행', date: '2025-05-05' })
    expect(manifest.couple.startedOn).toBe('2025-03-01')

    expect(push.sent().map((message) => [message.to, message.data])).toEqual([
      ['ExponentPushToken[requester]', { type: 'EXPORT_READY', jobId: res.body.id }],
    ])
    expect(await prisma.eventLog.count({ where: { name: 'notification_sent', userId: session.members[0].id } })).toBe(1)
    const job = await prisma.exportJob.findFirstOrThrow({ where: { id: res.body.id } })
    expect([job.requestedById, job.objectKey]).toEqual([
      session.members[0].id,
      exportZipKey(session.couple.id, res.body.id),
    ])
  })

  it('요청자에게 위치 동의가 없으면 장소 좌표(lat·lng)를 빼고 나머지는 담는다. 동의한 요청자의 내보내기에는 좌표를 담는다', async () => {
    const session = await newCouple()
    await prisma.consent.create({ data: { userId: session.members[1].id, kind: 'LOCATION', version: 'test' } })
    await seedMemories(session)
    const placesOf = async (who: 0 | 1) => {
      const res = await requestExport(session, who).expect(202)
      expect((await waitDone(session, res.body.id)).status).toBe('READY')
      const zip = await storage.getObject(exportZipKey(session.couple.id, res.body.id))
      if (!zip) throw new Error('zip 없음')
      const entries = readZip(zip).get('entries.json')?.toString('utf8') ?? '{}'
      return { raw: entries, places: exportManifestV1Schema.parse(JSON.parse(entries)).places }
    }

    const withoutConsent = await placesOf(0)
    expect(withoutConsent.places).toEqual([
      { id: expect.any(String), name: '한강', kakaoPlaceId: null, address: null, createdAt: expect.any(String) },
    ])
    expect(withoutConsent.raw).not.toMatch(/"(lat|lng)"/)
    const withConsent = await placesOf(1)
    expect(withConsent.places).toEqual([expect.objectContaining({ name: '한강', lat: 37.5, lng: 127 })])
  })

  it('downloadUrl은 조회할 때마다 10분(600초)으로 다시 서명하고, expiresAt(완료 후 24시간)은 그대로', async () => {
    const session = await newCouple()
    const job = await prisma.exportJob.create({
      data: {
        coupleId: session.couple.id,
        status: 'READY',
        objectKey: exportZipKey(session.couple.id, '0199e3a0-0000-7000-8000-0000000000e2'),
        expiresAt: new Date(Date.now() + DAY_S * 1000),
        completedAt: new Date(),
      },
    })
    const presignGet = jest.spyOn(storage, 'presignGet')
    const first = await getJob(session, job.id).expect(200)
    const second = await getJob(session, job.id).expect(200)
    expect([expiresOf(first.body.downloadUrl), expiresOf(second.body.downloadUrl)]).toEqual([600, 600])
    expect(presignGet).toHaveBeenCalledTimes(2)
    presignGet.mockRestore()
    expect(Date.parse(first.body.expiresAt) - Date.now()).toBeGreaterThan((DAY_S - 60) * 1000)
  })

  it('연결 해제 유예(UNLINKING) 중에도 내보내기를 요청·완료할 수 있다', async () => {
    const session = await newCouple({ status: 'UNLINKING', purgeAfter: new Date(Date.now() + 2 * DAY_S * 1000) })
    const res = await requestExport(session, 1).expect(202)
    expect((await waitDone(session, res.body.id)).status).toBe('READY')
  })

  it.each([
    ['purge가 1시간 안', 30 * 60_000],
    ['purge 시각이 지남', -60_000],
  ])('%s이면 409 PURGE_IMMINENT, 작업을 만들지 않는다', async (_label, offsetMs) => {
    const session = await newCouple({ status: 'UNLINKING', purgeAfter: new Date(Date.now() + offsetMs) })
    const res = await requestExport(session).expect(409)
    expect(res.body.code).toBe('PURGE_IMMINENT')
    expect(await prisma.exportJob.count()).toBe(0)
  })

  it('진행 중인 작업이 있으면 새로 만들지 않고 그 작업을 돌려준다', async () => {
    const session = await newCouple()
    const active = await prisma.exportJob.create({
      data: { coupleId: session.couple.id, requestedById: session.members[1].id, status: 'RUNNING' },
    })
    const res = await requestExport(session).expect(202)
    expect(res.body.id).toBe(active.id)
    expect(await prisma.exportJob.count({ where: { coupleId: session.couple.id } })).toBe(1)
  })

  it('GET /export는 가장 최근 작업(없으면 null), 다른 커플의 jobId는 404', async () => {
    const session = await newCouple()
    const other = await newCouple()
    const latest = () =>
      http()
        .get(API)
        .set(...bearer(session.tokens[1]))
        .expect(200)
    expect((await latest()).body).toEqual({ job: null })
    const res = await requestExport(session).expect(202)
    await waitDone(session, res.body.id)
    expect((await latest()).body.job).toMatchObject({ id: res.body.id, status: 'READY' })

    const theirs = await prisma.exportJob.create({
      data: { coupleId: other.couple.id, requestedById: other.members[0].id },
    })
    await getJob(session, theirs.id).expect(404)
  })

  it('만료(expiresAt 지남)된 작업은 downloadUrl null', async () => {
    const session = await newCouple()
    const job = await prisma.exportJob.create({
      data: {
        coupleId: session.couple.id,
        status: 'READY',
        objectKey: exportZipKey(session.couple.id, '0199e3a0-0000-7000-8000-0000000000e1'),
        expiresAt: new Date(Date.now() - 1000),
        completedAt: new Date(Date.now() - DAY_S * 1000),
      },
    })
    const { body } = await getJob(session, job.id).expect(200)
    expect(body).toMatchObject({ status: 'READY', downloadUrl: null })
  })
})
