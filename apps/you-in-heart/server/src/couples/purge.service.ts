import { Inject, Injectable, Logger } from '@nestjs/common'
import { sequentially } from '../common/async/sequentially'
import { PrismaService } from '../prisma/prisma.service'
import { OBJECT_STORAGE, type ObjectStorage } from '../storage/object-storage'
import {
  assertCouplePrefix,
  coupleIdFromLedgerKey,
  couplePrefixes,
  PURGE_LEDGER_PREFIX,
  purgeLedgerKey,
} from '../storage/storage-keys'

export type PurgeRunResult = { purged: number; failed: number }

type Outcome = 'purged' | 'purged-with-failure' | 'skipped' | 'error'

// cron 1회에 처리할 최대 커플 수(남으면 다음 날)
const PURGE_BATCH = 50

const errorName = (error: unknown): string => (error instanceof Error ? error.name : 'UnknownError')

// 연결 해제 30일 뒤 커플 데이터를 지운다(implementation-plan 0E.9 순서 고정):
// assertCouplePrefix → R2 원장 키 → DB 트랜잭션(Couple Cascade + PurgedCouple) → 접두사 3개 deletePrefix → 남으면 PurgeFailure
// 로그에는 id와 개수만 남긴다
@Injectable()
export class PurgeService {
  private readonly logger = new Logger(PurgeService.name)

  constructor(
    private readonly prisma: PrismaService,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
  ) {}

  async purgeDue(now: Date = new Date()): Promise<PurgeRunResult> {
    await this.retryFailures()
    const due = await this.prisma.couple.findMany({
      where: { status: 'UNLINKING', purgeAfter: { lte: now } },
      select: { id: true },
      orderBy: { purgeAfter: 'asc' },
      take: PURGE_BATCH,
    })
    const outcomes = await sequentially(due, ({ id }) => this.purgeCouple(id, now))
    return {
      purged: outcomes.filter((outcome) => outcome === 'purged' || outcome === 'purged-with-failure').length,
      failed: outcomes.filter((outcome) => outcome === 'purged-with-failure' || outcome === 'error').length,
    }
  }

  // 접두사 3개를 모두 검사한 뒤에만 지운다. 남은 객체 수
  async deleteCoupleObjects(coupleId: string): Promise<number> {
    const prefixes = couplePrefixes(coupleId)
    prefixes.forEach(assertCouplePrefix)
    await sequentially(prefixes, (prefix) => this.storage.deletePrefix(prefix))
    return this.countObjects(prefixes)
  }

  // 백업 복원 직후(ADR-003): 원장에 있는 커플이 DB·R2에 되살아났으면 다시 지운다
  async replayLedger(): Promise<{ replayed: number }> {
    const keys = await this.storage.listKeys(PURGE_LEDGER_PREFIX)
    const coupleIds = keys.flatMap((key) => {
      const id = coupleIdFromLedgerKey(key)
      return id ? [id] : []
    })
    await sequentially(coupleIds, async (coupleId) => {
      await this.deleteCoupleRows(coupleId, null, null)
      const remaining = await this.deleteObjectsOrRecord(coupleId)
      this.logger.log(`[purge-replay] couple ${coupleId} remaining=${remaining}`)
    })
    return { replayed: coupleIds.length }
  }

  private async purgeCouple(coupleId: string, now: Date): Promise<Outcome> {
    try {
      const prefixes = couplePrefixes(coupleId)
      prefixes.forEach(assertCouplePrefix)
      const before = await this.countObjects(prefixes)
      const ledgerKey = purgeLedgerKey(coupleId)
      await this.storage.putObject({ key: ledgerKey, body: Buffer.alloc(0), contentType: 'application/octet-stream' })
      const isDeleted = await this.deleteCoupleRows(coupleId, before, now)
      if (!isDeleted) {
        // 원장을 쓴 사이 조건이 바뀜(재연결 등) → 원장을 되돌려 replay가 살아 있는 커플을 지우지 않게 한다
        await this.storage.deleteObjects([ledgerKey])
        this.logger.warn(`[purge] couple ${coupleId} skipped (no longer due)`)
        return 'skipped'
      }
      const remaining = await this.deleteObjectsOrRecord(coupleId)
      this.logger.log(`[purge] couple ${coupleId} objects before=${before} after=${remaining}`)
      return remaining === 0 ? 'purged' : 'purged-with-failure'
    } catch (error) {
      this.logger.error(`[purge] couple ${coupleId} failed (${errorName(error)})`)
      return 'error'
    }
  }

  // now가 있으면 아직 삭제 조건(UNLINKING + purgeAfter 지남)일 때만 지운다. replay(now=null)는 원장이 근거라 무조건 지운다.
  // 탈퇴(DELETED)한 멤버의 User 행도 이때 지운다(상대의 30일 내보내기 동안만 남겨 둔 행)
  private deleteCoupleRows(coupleId: string, objectCountBefore: number | null, now: Date | null): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const members = await tx.coupleMember.findMany({ where: { coupleId }, select: { userId: true } })
      const where = now ? { id: coupleId, status: 'UNLINKING' as const, purgeAfter: { lte: now } } : { id: coupleId }
      const { count } = await tx.couple.deleteMany({ where })
      if (now && count === 0) return false
      await tx.purgedCouple.upsert({
        where: { id: coupleId },
        create: { id: coupleId, objectCountBefore },
        update: {},
      })
      await tx.user.deleteMany({ where: { id: { in: members.map(({ userId }) => userId) }, status: 'DELETED' } })
      return true
    })
  }

  // 스토리지 삭제 실패·잔여 객체는 PurgeFailure로 남기고 다음 실행에서 재시도한다
  private async deleteObjectsOrRecord(coupleId: string): Promise<number> {
    const remaining = await this.deleteCoupleObjects(coupleId).catch(async (error: unknown) => {
      this.logger.error(`[purge] couple ${coupleId} storage delete failed (${errorName(error)})`)
      return this.countObjects(couplePrefixes(coupleId)).catch(() => -1)
    })
    if (remaining !== 0) {
      await this.prisma.purgeFailure.create({
        data: { purgedCoupleId: coupleId, remainingKeys: remaining, detail: 'storage objects remain' },
      })
    }
    return remaining
  }

  private async retryFailures(): Promise<void> {
    const failures = await this.prisma.purgeFailure.findMany({
      where: { resolvedAt: null },
      select: { id: true, purgedCoupleId: true },
      orderBy: { createdAt: 'asc' },
      take: PURGE_BATCH,
    })
    await sequentially(failures, async ({ id, purgedCoupleId }) => {
      const remaining = await this.deleteCoupleObjects(purgedCoupleId).catch(() => -1)
      await this.prisma.purgeFailure.update({
        where: { id },
        data: remaining === 0 ? { resolvedAt: new Date(), remainingKeys: 0 } : { remainingKeys: remaining },
      })
      this.logger.log(`[purge] retry couple ${purgedCoupleId} remaining=${remaining}`)
    })
  }

  private async countObjects(prefixes: readonly string[]): Promise<number> {
    const lists = await Promise.all(prefixes.map((prefix) => this.storage.listKeys(prefix)))
    return lists.reduce((sum, keys) => sum + keys.length, 0)
  }
}
