import type { INestApplication } from '@nestjs/common'
import { PurgeService } from '../../src/couples/purge.service'
import { PUSH_SENDER } from '../../src/notifications/push.service'
import { PrismaService } from '../../src/prisma/prisma.service'
import { OBJECT_STORAGE, type ObjectStorage } from '../../src/storage/object-storage'
import { couplePrefixes, purgeLedgerKey, unlinkedCoupleLedgerKey } from '../../src/storage/storage-keys'
import { createPairedCouple, type PairedCouple } from '../integration/factories'
import { createFakePush } from '../integration/fake-push'
import { createTestApp } from '../integration/setup-app'
import { truncateAll } from '../integration/truncate'

const PAGINATION_OBJECTS = 1_100
const UPLOAD_CONCURRENCY = 50
const PAST = new Date(Date.now() - 60_000)

const chunk = <T>(items: readonly T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, index) => items.slice(index * size, (index + 1) * size))

describe('커플 purge (실DB + S3 호환 저장소)', () => {
  let app: INestApplication
  let prisma: PrismaService
  let storage: ObjectStorage
  let cleanupPrefixes: readonly string[] = []

  const putAll = async (keys: readonly string[]) => {
    await chunk(keys, UPLOAD_CONCURRENCY).reduce<Promise<void>>(async (previous, batch) => {
      await previous
      await Promise.all(
        batch.map((key) => storage.putObject({ key, body: Buffer.from('x'), contentType: 'text/plain' })),
      )
    }, Promise.resolve())
  }
  const countObjects = async (coupleId: string) => {
    const lists = await Promise.all(couplePrefixes(coupleId).map((prefix) => storage.listKeys(prefix)))
    return lists.reduce((sum, keys) => sum + keys.length, 0)
  }
  const twoPerPrefix = (coupleId: string) =>
    couplePrefixes(coupleId).flatMap((prefix) => [`${prefix}a.jpg`, `${prefix}nested/b.jpg`])

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

  it('head·listKeys·deletePrefix가 1,000개 페이지 경계를 넘어 동작한다', async () => {
    const { couple } = await createPairedCouple(prisma)
    const [prefix] = couplePrefixes(couple.id)
    cleanupPrefixes = [...cleanupPrefixes, ...couplePrefixes(couple.id)]
    const keys = Array.from({ length: PAGINATION_OBJECTS }, (_, index) => `${prefix}p/${index}`)
    await putAll(keys)

    expect(await storage.head(keys[0] ?? '')).toEqual({ size: 1 })
    expect(await storage.head(`${prefix}missing`)).toBeNull()
    expect(await storage.listKeys(prefix ?? '')).toHaveLength(PAGINATION_OBJECTS)
    await expect(storage.deletePrefix(prefix ?? '')).resolves.toBe(PAGINATION_OBJECTS)
    expect(await storage.listKeys(prefix ?? '')).toHaveLength(0)
  })

  it('getObject: 원장 본문(JSON)을 그대로 돌려주고, 없는 키는 null', async () => {
    const { couple } = await createPairedCouple(prisma)
    const key = unlinkedCoupleLedgerKey(couple.id)
    const body = JSON.stringify({ purgeAfter: '2026-12-01T03:00:00.000Z' })
    try {
      await storage.putObject({ key, body: Buffer.from(body), contentType: 'application/json' })
      expect((await storage.getObject(key))?.toString('utf8')).toBe(body)
      expect(await storage.getObject(`${key}-missing`)).toBeNull()
    } finally {
      await storage.deleteObjects([key])
    }
  })

  it('A(1,100개 포함)의 접두사 3개는 0건, B 객체 수는 그대로, 원장 키와 PurgedCouple이 남는다', async () => {
    const a: PairedCouple = await createPairedCouple(prisma, { status: 'UNLINKING', purgeAfter: PAST })
    const b: PairedCouple = await createPairedCouple(prisma)
    cleanupPrefixes = [...cleanupPrefixes, ...couplePrefixes(a.couple.id), ...couplePrefixes(b.couple.id)]
    const [aMain] = couplePrefixes(a.couple.id)
    const bulk = Array.from({ length: PAGINATION_OBJECTS }, (_, index) => `${aMain}p/${index}/o`)
    await putAll([...twoPerPrefix(a.couple.id), ...bulk, ...twoPerPrefix(b.couple.id)])
    expect(await countObjects(a.couple.id)).toBe(6 + PAGINATION_OBJECTS)

    try {
      await expect(app.get(PurgeService).purgeDue()).resolves.toEqual({ purged: 1, failed: 0 })
      expect(await countObjects(a.couple.id)).toBe(0)
      expect(await countObjects(b.couple.id)).toBe(6)
      expect(await storage.head(purgeLedgerKey(a.couple.id))).not.toBeNull()
      expect(await prisma.purgedCouple.findUnique({ where: { id: a.couple.id } })).toMatchObject({
        objectCountBefore: 6 + PAGINATION_OBJECTS,
      })
    } finally {
      await storage.deleteObjects([purgeLedgerKey(a.couple.id)])
    }
  })
})
