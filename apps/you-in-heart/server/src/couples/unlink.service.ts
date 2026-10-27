import { ConflictException, Inject, Injectable, Logger } from '@nestjs/common'
import { type Couple, UNLINK_GRACE_DAYS } from '@you-in-heart/shared'
import { z } from 'zod'
import { sequentially } from '../common/async/sequentially'
import type { Prisma } from '../generated/prisma'
import { PrismaService } from '../prisma/prisma.service'
import { OBJECT_STORAGE, type ObjectStorage } from '../storage/object-storage'
import {
  coupleIdFromUnlinkedLedgerKey,
  UNLINKED_COUPLE_LEDGER_PREFIX,
  unlinkedCoupleLedgerKey,
} from '../storage/storage-keys'
import { CouplesService, type PartnerNotice } from './couples.service'

const DAY_MS = 86_400_000
const GRACE_MS = UNLINK_GRACE_DAYS * DAY_MS

const UNLINK_REQUESTED: PartnerNotice = {
  title: '연결 해제 요청이 있었어요',
  body: '30일 동안 기록을 보고 내보낼 수 있어요',
  type: 'UNLINK_REQUESTED',
}

const unlinkLedgerSchema = z.object({ purgeAfter: z.iso.datetime() })

const conflict = (message: string) => new ConflictException(message)
const alreadyUnlinking = () => conflict('이미 연결 해제 중이에요')

const errorName = (error: unknown): string => (error instanceof Error ? error.name : 'UnknownError')

// 원장 본문 → purgeAfter. 깨졌으면 null
const parseLedger = (body: Buffer | null): Date | null => {
  if (!body) return null
  try {
    const parsed = unlinkLedgerSchema.safeParse(JSON.parse(body.toString('utf8')))
    return parsed.success ? new Date(parsed.data.purgeAfter) : null
  } catch {
    return null
  }
}

// ACTIVE → UNLINKING. 이미 UNLINKING이면 false(유예 기간을 늘리지 않는다)
const markUnlinking = async (
  tx: Prisma.TransactionClient,
  coupleId: string,
  requesterId: string,
  now: Date,
): Promise<boolean> => {
  const { count } = await tx.couple.updateMany({
    where: { id: coupleId, status: 'ACTIVE' },
    data: {
      status: 'UNLINKING',
      unlinkRequestedAt: now,
      unlinkRequestedBy: requesterId,
      purgeAfter: new Date(now.getTime() + GRACE_MS),
    },
  })
  if (count === 0) return false
  await tx.coupleMember.updateMany({ where: { coupleId }, data: { reconnectConfirmedAt: null } })
  return true
}

// 해제는 한 사람의 요청만으로 성립(architecture §5.3). 재연결은 두 사람 모두 확인해야 한다.
// 해제 전 R2 원장(system/unlinked-couples/)에 purgeAfter를 써서 백업 복원 후에도 유예가 이어지게 한다(ADR-003)
@Injectable()
export class UnlinkService {
  private readonly logger = new Logger(UnlinkService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly couples: CouplesService,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
  ) {}

  async requestUnlink(coupleId: string, userId: string): Promise<Couple> {
    const couple = await this.prisma.couple.findUnique({ where: { id: coupleId }, select: { status: true } })
    if (couple?.status !== 'ACTIVE') throw alreadyUnlinking()
    const now = new Date()
    await this.writeLedger(coupleId, now)
    const isChanged = await this.prisma.$transaction((tx) => markUnlinking(tx, coupleId, userId, now))
    if (!isChanged) throw alreadyUnlinking()
    await this.couples.notifyPartner(coupleId, userId, UNLINK_REQUESTED)
    return this.couples.getCouple(coupleId)
  }

  // 회원 탈퇴: 커플이 있으면 UNLINKING으로 바꾸고(이미 유예 중이면 유지) 탈퇴자의 재연결 확인을 지운다. 커플 id 또는 null.
  // 복원 재적용(shouldNotify=false)은 상대에게 다시 알리지 않는다
  async unlinkForAccountDeletion(userId: string, { shouldNotify = true } = {}): Promise<string | null> {
    const member = await this.prisma.coupleMember.findUnique({
      where: { userId },
      select: { coupleId: true, couple: { select: { status: true } } },
    })
    if (!member) return null
    const { coupleId } = member
    const now = new Date()
    if (member.couple.status === 'ACTIVE') await this.writeLedger(coupleId, now)
    const isChanged = await this.prisma.$transaction(async (tx) => {
      const changed = await markUnlinking(tx, coupleId, userId, now)
      await tx.coupleMember.updateMany({ where: { coupleId, userId }, data: { reconnectConfirmedAt: null } })
      return changed
    })
    if (isChanged && shouldNotify) await this.couples.notifyPartner(coupleId, userId, UNLINK_REQUESTED)
    return coupleId
  }

  // 커플 행을 잠가 두 사람이 동시에 확인해도 서로의 확인을 놓치지 않는다. 유예가 끝났으면(purge 대기) 409
  async reconnect(coupleId: string, userId: string): Promise<Couple> {
    const isReconnected = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Couple" WHERE id = ${coupleId}::uuid FOR UPDATE`
      const couple = await tx.couple.findFirst({
        where: { id: coupleId },
        select: {
          status: true,
          purgeAfter: true,
          members: { select: { userId: true, reconnectConfirmedAt: true, user: { select: { status: true } } } },
        },
      })
      const now = new Date()
      if (!couple || couple.status !== 'UNLINKING') throw conflict('연결 해제 중인 커플이 아니에요')
      if (!couple.purgeAfter || couple.purgeAfter <= now) throw conflict('유예 기간이 끝났어요')
      await tx.coupleMember.updateMany({ where: { coupleId, userId }, data: { reconnectConfirmedAt: now } })
      // 탈퇴한 멤버가 있으면 재연결할 수 없다
      const isEveryoneBack = couple.members.every(
        (member) =>
          member.user.status === 'ACTIVE' && (member.userId === userId || member.reconnectConfirmedAt !== null),
      )
      if (!isEveryoneBack) return false
      await tx.couple.update({
        where: { id: coupleId },
        data: { status: 'ACTIVE', unlinkRequestedAt: null, unlinkRequestedBy: null, purgeAfter: null },
      })
      await tx.coupleMember.updateMany({ where: { coupleId }, data: { reconnectConfirmedAt: null } })
      return true
    })
    if (isReconnected) await this.removeLedger(coupleId)
    return this.couples.getCouple(coupleId)
  }

  // 백업 복원 직후: 원장에 있는데 ACTIVE로 돌아간 커플을 원장의 purgeAfter로 다시 UNLINKING. 원장 항목 수
  async replayLedger(): Promise<number> {
    const keys = await this.storage.listKeys(UNLINKED_COUPLE_LEDGER_PREFIX)
    const coupleIds = keys.flatMap((key) => {
      const id = coupleIdFromUnlinkedLedgerKey(key)
      return id ? [id] : []
    })
    await sequentially(coupleIds, (coupleId) => this.replayUnlink(coupleId))
    return coupleIds.length
  }

  private async replayUnlink(coupleId: string): Promise<void> {
    const purgeAfter = parseLedger(await this.storage.getObject(unlinkedCoupleLedgerKey(coupleId)))
    if (!purgeAfter) {
      this.logger.warn(`[purge-replay] unlinked couple ${coupleId} ledger unreadable`)
      return
    }
    const couple = await this.prisma.couple.findUnique({
      where: { id: coupleId },
      select: { status: true, unlinkRequestedAt: true },
    })
    if (couple?.status !== 'ACTIVE') return
    // 요청 시각은 원장에 없다 → purgeAfter − 유예 기간(요청 때 그렇게 계산했다)
    const unlinkRequestedAt = couple.unlinkRequestedAt ?? new Date(purgeAfter.getTime() - GRACE_MS)
    await this.prisma.$transaction([
      this.prisma.couple.updateMany({
        where: { id: coupleId, status: 'ACTIVE' },
        data: { status: 'UNLINKING', purgeAfter, unlinkRequestedAt },
      }),
      this.prisma.coupleMember.updateMany({ where: { coupleId }, data: { reconnectConfirmedAt: null } }),
    ])
    this.logger.log(`[purge-replay] couple ${coupleId} unlinking re-applied`)
  }

  // DB를 바꾸기 전에 쓴다. 실패하면 요청 전체가 5xx로 끝나고 DB는 그대로다
  private writeLedger(coupleId: string, now: Date): Promise<void> {
    const purgeAfter = new Date(now.getTime() + GRACE_MS).toISOString()
    return this.storage.putObject({
      key: unlinkedCoupleLedgerKey(coupleId),
      body: Buffer.from(JSON.stringify({ purgeAfter })),
      contentType: 'application/json',
    })
  }

  // 재연결은 이미 끝났다. 지우기 실패는 남은 원장이 복원 후 다시 유예로 돌릴 뿐이라 요청을 실패시키지 않는다
  private async removeLedger(coupleId: string): Promise<void> {
    try {
      await this.storage.deleteObjects([unlinkedCoupleLedgerKey(coupleId)])
    } catch (error) {
      this.logger.warn(`[unlink] couple ${coupleId} ledger delete failed (${errorName(error)})`)
    }
  }
}
