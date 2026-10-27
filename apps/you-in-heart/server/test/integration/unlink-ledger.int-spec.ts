import type { INestApplication } from '@nestjs/common'
import { UNLINK_GRACE_DAYS } from '@you-in-heart/shared'
import request from 'supertest'
import { UnlinkService } from '../../src/couples/unlink.service'
import { PUSH_SENDER } from '../../src/notifications/push.service'
import { PrismaService } from '../../src/prisma/prisma.service'
import { MemoryObjectStorage } from '../../src/storage/memory-object-storage'
import { OBJECT_STORAGE } from '../../src/storage/object-storage'
import { unlinkedCoupleLedgerKey } from '../../src/storage/storage-keys'
import { bearer, tokenFor } from './auth-helpers'
import { createPairedCouple, grantRequiredConsents, type PairedCouple } from './factories'
import { createFakePush } from './fake-push'
import { createTestApp } from './setup-app'
import { truncateAll } from './truncate'

const DAY_MS = 86_400_000

// 백업 복원(ADR-003)으로 ACTIVE가 된 커플도 R2 원장(system/unlinked-couples/)을 근거로 유예를 다시 적용한다
describe('연결 해제 원장과 복원 재적용 (실DB + 메모리 스토리지)', () => {
  let app: INestApplication
  let prisma: PrismaService
  let storage: MemoryObjectStorage
  const push = createFakePush()

  const http = () => request(app.getHttpServer())
  const unlink = async (userId: string) =>
    http()
      .post('/api/v1/couples/me/unlink')
      .set(...bearer(await tokenFor(app, userId)))
  const reconnect = async (userId: string) =>
    http()
      .post('/api/v1/couples/me/reconnect')
      .set(...bearer(await tokenFor(app, userId)))
  const replay = () => app.get(UnlinkService).replayLedger()

  const pairedWithConsents = async (): Promise<PairedCouple> => {
    const paired = await createPairedCouple(prisma)
    await grantRequiredConsents(
      prisma,
      paired.members.map((member) => member.id),
    )
    return paired
  }
  const coupleState = (coupleId: string) =>
    prisma.couple.findUnique({
      where: { id: coupleId },
      select: { status: true, purgeAfter: true, unlinkRequestedAt: true },
    })

  beforeAll(async () => {
    storage = new MemoryObjectStorage()
    app = await createTestApp((builder) =>
      builder.overrideProvider(OBJECT_STORAGE).useValue(storage).overrideProvider(PUSH_SENDER).useValue(push.sender),
    )
    prisma = app.get(PrismaService)
  })

  beforeEach(async () => {
    await truncateAll(prisma)
    storage.clear()
    push.reset()
    jest.restoreAllMocks()
  })

  afterAll(async () => {
    await app.close()
  })

  describe('POST /couples/me/unlink · reconnect', () => {
    it('해제 요청 시 원장에 purgeAfter를 쓰고, 두 사람이 재연결하면 원장을 지운다', async () => {
      const { couple, members } = await pairedWithConsents()
      expect((await unlink(members[0].id)).status).toBe(200)
      const ledger = await storage.getObject(unlinkedCoupleLedgerKey(couple.id))
      const { purgeAfter } = await prisma.couple.findUniqueOrThrow({ where: { id: couple.id } })
      expect(JSON.parse(ledger?.toString('utf8') ?? '{}')).toEqual({ purgeAfter: purgeAfter?.toISOString() })
      expect((purgeAfter?.getTime() ?? 0) - Date.now()).toBeGreaterThan((UNLINK_GRACE_DAYS - 1) * DAY_MS)

      expect((await reconnect(members[0].id)).status).toBe(200)
      expect(await storage.head(unlinkedCoupleLedgerKey(couple.id))).not.toBeNull()
      expect((await reconnect(members[1].id)).status).toBe(200)
      expect(await storage.head(unlinkedCoupleLedgerKey(couple.id))).toBeNull()
    })

    it('원장 쓰기가 실패하면 5xx이고 커플은 ACTIVE 그대로다', async () => {
      const { couple, members } = await pairedWithConsents()
      jest.spyOn(storage, 'putObject').mockRejectedValue(new Error('R2 장애'))
      const res = await unlink(members[0].id)
      expect(res.status).toBeGreaterThanOrEqual(500)
      expect(await coupleState(couple.id)).toEqual({ status: 'ACTIVE', purgeAfter: null, unlinkRequestedAt: null })
    })

    it('이미 유예 중이면 409이고 원장의 purgeAfter를 늘리지 않는다', async () => {
      const { couple, members } = await pairedWithConsents()
      expect((await unlink(members[0].id)).status).toBe(200)
      const first = (await storage.getObject(unlinkedCoupleLedgerKey(couple.id)))?.toString('utf8')
      expect((await unlink(members[1].id)).status).toBe(409)
      expect((await storage.getObject(unlinkedCoupleLedgerKey(couple.id)))?.toString('utf8')).toBe(first)
    })

    it('복원으로 ACTIVE가 된 커플을 replay가 원장의 purgeAfter로 UNLINKING으로 되돌린다(멱등)', async () => {
      const { couple, members } = await pairedWithConsents()
      expect((await unlink(members[0].id)).status).toBe(200)
      const original = await coupleState(couple.id)
      await prisma.couple.update({
        where: { id: couple.id },
        data: { status: 'ACTIVE', purgeAfter: null, unlinkRequestedAt: null, unlinkRequestedBy: null },
      })
      const untouched = await pairedWithConsents()

      await expect(replay()).resolves.toBe(1)
      const restored = await coupleState(couple.id)
      expect(restored).toMatchObject({ status: 'UNLINKING', purgeAfter: original?.purgeAfter })
      expect(restored?.unlinkRequestedAt).not.toBeNull()
      expect((await coupleState(untouched.couple.id))?.status).toBe('ACTIVE')

      await replay()
      expect(await coupleState(couple.id)).toEqual(restored)
    })
  })
})
