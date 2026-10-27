import { type INestApplication, Logger } from '@nestjs/common'
import request from 'supertest'
import { PurgeCron } from '../../src/couples/purge.cron'
import { PurgeService } from '../../src/couples/purge.service'
import { PUSH_SENDER } from '../../src/notifications/push.service'
import { PrismaService } from '../../src/prisma/prisma.service'
import { MemoryObjectStorage } from '../../src/storage/memory-object-storage'
import { OBJECT_STORAGE } from '../../src/storage/object-storage'
import { couplePrefixes, purgeLedgerKey } from '../../src/storage/storage-keys'
import { bearer, tokenFor } from './auth-helpers'
import { COUPLE_TABLES, countCoupleRows } from './couple-tables'
import { createPairedCouple, type PairedCouple, seedCoupleData } from './factories'
import { createFakePush } from './fake-push'
import { createTestApp } from './setup-app'
import { truncateAll } from './truncate'

const PAST = new Date(Date.now() - 60_000)
const FUTURE = new Date(Date.now() + 86_400_000)
const OBJECTS_PER_PREFIX = 2

describe('커플 purge (실DB + 메모리 스토리지)', () => {
  let app: INestApplication
  let prisma: PrismaService
  let storage: MemoryObjectStorage
  let purge: PurgeService

  const putCoupleObjects = (coupleId: string) =>
    Promise.all(
      couplePrefixes(coupleId).flatMap((prefix) =>
        Array.from({ length: OBJECTS_PER_PREFIX }, (_, index) =>
          storage.putObject({ key: `${prefix}obj-${index}`, body: Buffer.from('x'), contentType: 'image/jpeg' }),
        ),
      ),
    )
  const countObjects = async (coupleId: string) => {
    const lists = await Promise.all(couplePrefixes(coupleId).map((prefix) => storage.listKeys(prefix)))
    return lists.reduce((sum, keys) => sum + keys.length, 0)
  }
  const createDueCouple = async (): Promise<PairedCouple> => {
    const paired = await createPairedCouple(prisma, { status: 'UNLINKING', purgeAfter: PAST })
    await seedCoupleData(prisma, paired)
    await putCoupleObjects(paired.couple.id)
    return paired
  }
  const createActiveCouple = async (): Promise<PairedCouple> => {
    const paired = await createPairedCouple(prisma)
    await seedCoupleData(prisma, paired)
    await putCoupleObjects(paired.couple.id)
    return paired
  }

  beforeAll(async () => {
    storage = new MemoryObjectStorage()
    app = await createTestApp((builder) =>
      builder
        .overrideProvider(OBJECT_STORAGE)
        .useValue(storage)
        .overrideProvider(PUSH_SENDER)
        .useValue(createFakePush().sender),
    )
    prisma = app.get(PrismaService)
    purge = app.get(PurgeService)
  })

  beforeEach(async () => {
    await truncateAll(prisma)
    storage.clear()
    jest.restoreAllMocks()
  })

  afterAll(async () => {
    await app.close()
  })

  it('유예가 끝난 커플 A의 모든 커플 소유 행·접두사 3개 객체를 지우고, 커플 B는 그대로 둔다', async () => {
    const a = await createDueCouple()
    const b = await createActiveCouple()
    const before = await countCoupleRows(prisma, a.couple.id)
    // 시드가 coupleId 모델 전부를 덮는지 확인(새 테이블이 생기면 seedCoupleData에 추가해야 한다)
    expect(COUPLE_TABLES.filter(({ model }) => (before[model] ?? 0) < 1)).toEqual([])
    const bRowsBefore = await countCoupleRows(prisma, b.couple.id)
    const logSpy = jest.spyOn(Logger.prototype, 'log')

    await expect(purge.purgeDue()).resolves.toEqual({ purged: 1, failed: 0 })

    const after = await countCoupleRows(prisma, a.couple.id)
    expect(Object.entries(after).filter(([, count]) => count > 0)).toEqual([])
    expect(await prisma.couple.count({ where: { id: a.couple.id } })).toBe(0)
    expect(await countObjects(a.couple.id)).toBe(0)
    expect(await countCoupleRows(prisma, b.couple.id)).toEqual(bRowsBefore)
    expect(await countObjects(b.couple.id)).toBe(6)
    expect(await storage.head(purgeLedgerKey(a.couple.id))).not.toBeNull()
    expect(await prisma.purgedCouple.findUnique({ where: { id: a.couple.id } })).toMatchObject({ objectCountBefore: 6 })
    expect(await prisma.purgeFailure.count()).toBe(0)

    // 로그에는 id와 개수만(일기 본문·좌표 없음)
    const logged = logSpy.mock.calls.map((call) => String(call[0])).join('\n')
    expect(logged).toContain(a.couple.id)
    expect(logged).not.toMatch(/성수동|보고 싶어|37\.52|126\.93/)

    // 두 사람은 다시 초대 코드를 만들 수 있다
    await Promise.all(
      a.members.map(async (member) =>
        request(app.getHttpServer())
          .post('/api/v1/couples/invites')
          .set(...bearer(await tokenFor(app, member.id)))
          .expect(201),
      ),
    )
  })

  it('탈퇴(DELETED)한 멤버의 User 행은 purge 때 지우고, 남은 사람은 유지한다', async () => {
    const a = await createDueCouple()
    await prisma.user.update({ where: { id: a.members[0].id }, data: { status: 'DELETED', displayName: null } })
    await purge.purgeDue()
    expect(await prisma.user.count({ where: { id: a.members[0].id } })).toBe(0)
    expect(await prisma.user.count({ where: { id: a.members[1].id } })).toBe(1)
  })

  it('purgeAfter가 미래이거나 재연결(ACTIVE)된 커플은 지우지 않는다', async () => {
    const waiting = await createPairedCouple(prisma, { status: 'UNLINKING', purgeAfter: FUTURE })
    const reconnected = await createPairedCouple(prisma, { status: 'ACTIVE', purgeAfter: PAST })
    await putCoupleObjects(waiting.couple.id)

    await expect(purge.purgeDue()).resolves.toEqual({ purged: 0, failed: 0 })
    expect(await prisma.couple.count()).toBe(2)
    expect(await countObjects(waiting.couple.id)).toBe(6)
    expect(await storage.head(purgeLedgerKey(waiting.couple.id))).toBeNull()
    expect(await storage.head(purgeLedgerKey(reconnected.couple.id))).toBeNull()
  })

  it('PURGE_ENABLED=false면 cron이 아무것도 지우지 않는다', async () => {
    const a = await createDueCouple()
    await app.get(PurgeCron).run()
    expect(await prisma.couple.count({ where: { id: a.couple.id } })).toBe(1)
    expect(await countObjects(a.couple.id)).toBe(6)
  })

  it('스토리지 삭제가 실패하면 PurgeFailure를 남기고, 다음 실행에서 재시도해 해결한다', async () => {
    const a = await createDueCouple()
    jest.spyOn(storage, 'deletePrefix').mockRejectedValueOnce(new Error('R2 일시 장애'))

    await expect(purge.purgeDue()).resolves.toEqual({ purged: 1, failed: 1 })
    expect(await prisma.couple.count({ where: { id: a.couple.id } })).toBe(0)
    const failure = await prisma.purgeFailure.findFirstOrThrow({ where: { purgedCoupleId: a.couple.id } })
    expect(failure.resolvedAt).toBeNull()
    expect(failure.remainingKeys).toBeGreaterThan(0)

    await purge.purgeDue()
    expect(await countObjects(a.couple.id)).toBe(0)
    expect(await prisma.purgeFailure.count({ where: { resolvedAt: null } })).toBe(0)
  })

  it('접두사 정규식에 맞지 않으면 삭제를 한 번도 호출하지 않고 throw', async () => {
    const deleteSpy = jest.spyOn(storage, 'deletePrefix')
    await expect(purge.deleteCoupleObjects('not-a-uuid')).rejects.toThrow()
    await expect(purge.deleteCoupleObjects('')).rejects.toThrow()
    expect(deleteSpy).not.toHaveBeenCalled()
  })

  it('purge-replay: 백업 복원으로 되살아난 커플을 원장(system/purge-ledger/) 기준으로 다시 지운다', async () => {
    const a = await createDueCouple()
    await purge.purgeDue()
    // 백업 복원 흉내: 같은 id의 커플·행·객체가 다시 생긴다
    const restored = await prisma.couple.create({ data: { id: a.couple.id, status: 'ACTIVE' } })
    await prisma.eventLog.create({ data: { coupleId: restored.id, name: 'app_open' } })
    await putCoupleObjects(restored.id)
    const survivor = await createActiveCouple()

    await expect(purge.replayLedger()).resolves.toEqual({ replayed: 1 })
    expect(await prisma.couple.count({ where: { id: a.couple.id } })).toBe(0)
    expect(await countObjects(a.couple.id)).toBe(0)
    expect(await prisma.couple.count({ where: { id: survivor.couple.id } })).toBe(1)
    expect(await countObjects(survivor.couple.id)).toBe(6)
  })
})
