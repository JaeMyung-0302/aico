import { Injectable, Logger } from '@nestjs/common'
import { type ComputedAnniversary, computeAnniversaries, toKstDate } from '@you-in-heart/shared'
import { sequentially } from '../common/async/sequentially'
import { fromDbDate, toDbDate } from '../common/dates/db-date'
import { isUniqueViolation } from '../common/prisma/prisma-errors'
import type { NotificationLogKind } from '../generated/prisma'
import { CoupleNotifier } from '../notifications/couple-notifier'
import type { PushNotice } from '../notifications/push.service'
import { PrismaService } from '../prisma/prisma.service'

const COUPLE_BATCH = 200
const DAY_MS = 86_400_000

type ReminderTarget = { kind: NotificationLogKind; daysLeft: number; title: string; body: string }

// 잠금 화면에 보이므로 기념일 제목·날짜는 넣지 않는다
const TARGETS: readonly ReminderTarget[] = [
  { kind: 'ANNIVERSARY_D0', daysLeft: 0, title: '오늘은 기념일이에요', body: '함께 축하해 보세요' },
  { kind: 'ANNIVERSARY_D3', daysLeft: 3, title: '기념일이 3일 남았어요', body: '앱에서 확인해 보세요' },
]

type CoupleRow = {
  id: string
  startedOn: Date | null
  anniversaries: { id: string; title: string; date: Date }[]
  members: { userId: string }[]
}

type DueItem = { target: ReminderTarget; anniversary: ComputedAnniversary }

export type ReminderRunResult = { today: string; couples: number; sent: number }

const sum = (values: readonly number[]): number => values.reduce((total, value) => total + value, 0)

const addDays = (ymd: string, days: number): string => fromDbDate(new Date(toDbDate(ymd).getTime() + days * DAY_MS))

// 오늘(D-0)과 3일 뒤(D-3)가 날짜인 기념일
const dueItems = (couple: CoupleRow, today: string): DueItem[] => {
  const anniversaries = computeAnniversaries({
    startedOn: couple.startedOn ? fromDbDate(couple.startedOn) : null,
    customs: couple.anniversaries.map(({ id, title, date }) => ({ id, title, date: fromDbDate(date) })),
    today,
    horizonDays: 3,
  })
  return TARGETS.flatMap((target) => {
    const dueOn = addDays(today, target.daysLeft)
    return anniversaries.filter((item) => item.date === dueOn).map((anniversary) => ({ target, anniversary }))
  })
}

// 예약을 저장하지 않고 매일 계산한다(architecture §7). NotificationLog 유니크(kind, coupleId, refKey, dueOn)가 중복 발송을 막는다:
// refKey = '{기념일 refKey}:{수신자 userId}', dueOn = 발송일(KST) → 멤버마다 1행, 같은 날 재실행은 0건
@Injectable()
export class AnniversaryReminderService {
  private readonly logger = new Logger(AnniversaryReminderService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifier: CoupleNotifier,
  ) {}

  async runOnce(now: Date = new Date()): Promise<ReminderRunResult> {
    const today = toKstDate(now)
    const run = async (cursor: string | undefined, acc: ReminderRunResult): Promise<ReminderRunResult> => {
      const couples = await this.findActiveCouples(cursor)
      const sent = sum(await sequentially(couples, (couple) => this.remindCouple(couple, today)))
      const next = { today, couples: acc.couples + couples.length, sent: acc.sent + sent }
      const last = couples.at(-1)
      return couples.length === COUPLE_BATCH && last ? run(last.id, next) : next
    }
    const result = await run(undefined, { today, couples: 0, sent: 0 })
    this.logger.log(`[anniversary] ${JSON.stringify(result)}`)
    return result
  }

  private findActiveCouples(cursor: string | undefined): Promise<CoupleRow[]> {
    return this.prisma.couple.findMany({
      where: { status: 'ACTIVE', ...(cursor ? { id: { gt: cursor } } : {}) },
      orderBy: { id: 'asc' },
      take: COUPLE_BATCH,
      select: {
        id: true,
        startedOn: true,
        anniversaries: { select: { id: true, title: true, date: true } },
        members: { where: { user: { status: 'ACTIVE' } }, select: { userId: true } },
      },
    })
  }

  private async remindCouple(couple: CoupleRow, today: string): Promise<number> {
    const due = dueItems(couple, today)
    const counts = await sequentially(due, async ({ target, anniversary }) => {
      const claimed = await this.claimRecipients(couple, target.kind, anniversary.refKey, today)
      const notices: PushNotice[] = claimed.map((userId) => ({
        userId,
        title: target.title,
        body: target.body,
        data: { type: target.kind, anniversaryId: anniversary.id },
      }))
      await this.notifier.notify(couple.id, target.kind, notices)
      return notices.length
    })
    return sum(counts)
  }

  // insert 성공 = 이번 실행이 발송 권한을 얻음. 유니크 충돌 = 이미 보낸 알림
  private async claimRecipients(
    couple: CoupleRow,
    kind: NotificationLogKind,
    refKey: string,
    today: string,
  ): Promise<string[]> {
    const claims = await Promise.all(
      couple.members.map(async ({ userId }) => {
        try {
          await this.prisma.notificationLog.create({
            data: { coupleId: couple.id, kind, refKey: `${refKey}:${userId}`, dueOn: toDbDate(today) },
          })
          return [userId]
        } catch (error) {
          if (isUniqueViolation(error)) return []
          throw error
        }
      }),
    )
    return claims.flat()
  }
}
