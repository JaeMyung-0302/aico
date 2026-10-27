import { ConflictException, Injectable } from '@nestjs/common'
import { type Couple, UNLINK_GRACE_DAYS } from '@you-in-heart/shared'
import type { Prisma } from '../generated/prisma'
import { PrismaService } from '../prisma/prisma.service'
import { CouplesService, type PartnerNotice } from './couples.service'

const DAY_MS = 86_400_000

const UNLINK_REQUESTED: PartnerNotice = {
  title: '연결 해제 요청이 있었어요',
  body: '30일 동안 기록을 보고 내보낼 수 있어요',
  type: 'UNLINK_REQUESTED',
}

const conflict = (message: string) => new ConflictException(message)

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
      purgeAfter: new Date(now.getTime() + UNLINK_GRACE_DAYS * DAY_MS),
    },
  })
  if (count === 0) return false
  await tx.coupleMember.updateMany({ where: { coupleId }, data: { reconnectConfirmedAt: null } })
  return true
}

// 해제는 한 사람의 요청만으로 성립(architecture §5.3). 재연결은 두 사람 모두 확인해야 한다
@Injectable()
export class UnlinkService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly couples: CouplesService,
  ) {}

  async requestUnlink(coupleId: string, userId: string): Promise<Couple> {
    const isChanged = await this.prisma.$transaction((tx) => markUnlinking(tx, coupleId, userId, new Date()))
    if (!isChanged) throw conflict('이미 연결 해제 중이에요')
    await this.couples.notifyPartner(coupleId, userId, UNLINK_REQUESTED)
    return this.couples.getCouple(coupleId)
  }

  // 회원 탈퇴: 커플이 있으면 UNLINKING으로 바꾸고(이미 유예 중이면 유지) 탈퇴자의 재연결 확인을 지운다. 커플 id 또는 null
  async unlinkForAccountDeletion(userId: string): Promise<string | null> {
    const member = await this.prisma.coupleMember.findUnique({ where: { userId }, select: { coupleId: true } })
    if (!member) return null
    const { coupleId } = member
    const isChanged = await this.prisma.$transaction(async (tx) => {
      const changed = await markUnlinking(tx, coupleId, userId, new Date())
      await tx.coupleMember.updateMany({ where: { coupleId, userId }, data: { reconnectConfirmedAt: null } })
      return changed
    })
    if (isChanged) await this.couples.notifyPartner(coupleId, userId, UNLINK_REQUESTED)
    return coupleId
  }

  // 커플 행을 잠가 두 사람이 동시에 확인해도 서로의 확인을 놓치지 않는다. 유예가 끝났으면(purge 대기) 409
  async reconnect(coupleId: string, userId: string): Promise<Couple> {
    await this.prisma.$transaction(async (tx) => {
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
      if (!isEveryoneBack) return
      await tx.couple.update({
        where: { id: coupleId },
        data: { status: 'ACTIVE', unlinkRequestedAt: null, unlinkRequestedBy: null, purgeAfter: null },
      })
      await tx.coupleMember.updateMany({ where: { coupleId }, data: { reconnectConfirmedAt: null } })
    })
    return this.couples.getCouple(coupleId)
  }
}
