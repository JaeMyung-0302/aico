import { Injectable, NotFoundException } from '@nestjs/common'
import type { Couple, UpdateCoupleRequest } from '@you-in-heart/shared'
import { fromDbDate, toDbDate } from '../common/dates/db-date'
import type { NotificationLogKind, Prisma } from '../generated/prisma'
import { CoupleNotifier } from '../notifications/couple-notifier'
import { PrismaService } from '../prisma/prisma.service'

const COUPLE_SELECT = {
  id: true,
  status: true,
  startedOn: true,
  unlinkRequestedAt: true,
  unlinkRequestedBy: true,
  purgeAfter: true,
  members: {
    select: { userId: true, slot: true, reconnectConfirmedAt: true, user: { select: { displayName: true } } },
    orderBy: { slot: 'asc' },
  },
} satisfies Prisma.CoupleSelect

type CoupleRow = Prisma.CoupleGetPayload<{ select: typeof COUPLE_SELECT }>

// 잠금 화면에 보이므로 날짜·이름 등 내용은 넣지 않는다
export type PartnerNotice = { title: string; body: string; type: NotificationLogKind; data?: Record<string, string> }

const STARTED_ON_CHANGED: PartnerNotice = {
  title: '사귄 날이 바뀌었어요',
  body: '앱에서 확인해 보세요',
  type: 'STARTED_ON_CHANGED',
}

const toCoupleResponse = (row: CoupleRow): Couple => ({
  id: row.id,
  status: row.status,
  startedOn: row.startedOn ? fromDbDate(row.startedOn) : null,
  members: row.members.map((member) => ({
    userId: member.userId,
    displayName: member.user.displayName,
    slot: member.slot === 1 ? 1 : 2,
    reconnectConfirmedAt: member.reconnectConfirmedAt?.toISOString() ?? null,
  })),
  unlinkRequestedAt: row.unlinkRequestedAt?.toISOString() ?? null,
  unlinkRequestedBy: row.unlinkRequestedBy,
  purgeAfter: row.purgeAfter?.toISOString() ?? null,
})

// 모든 함수는 CoupleGuard가 찾은 coupleId를 필수 첫 인자로 받는다
@Injectable()
export class CouplesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifier: CoupleNotifier,
  ) {}

  async getCouple(coupleId: string): Promise<Couple> {
    const row = await this.prisma.couple.findFirst({ where: { id: coupleId }, select: COUPLE_SELECT })
    if (!row) throw new NotFoundException('커플을 찾을 수 없어요')
    return toCoupleResponse(row)
  }

  // 두 멤버 모두 수정할 수 있고, 수정하면 상대에게 알린다
  async updateStartedOn(coupleId: string, actorId: string, { startedOn }: UpdateCoupleRequest): Promise<Couple> {
    await this.prisma.couple.update({ where: { id: coupleId }, data: { startedOn: toDbDate(startedOn) } })
    await this.notifyPartner(coupleId, actorId, STARTED_ON_CHANGED)
    return this.getCouple(coupleId)
  }

  // 상대 멤버(actor 제외)에게 알린다. data에는 type과 id만
  async notifyPartner(coupleId: string, actorId: string, { title, body, type, data }: PartnerNotice): Promise<void> {
    const partners = await this.prisma.coupleMember.findMany({
      where: { coupleId, userId: { not: actorId } },
      select: { userId: true },
    })
    const notices = partners.map(({ userId }) => ({ userId, title, body, data: { ...data, type } }))
    await this.notifier.notify(coupleId, type, notices)
  }
}
