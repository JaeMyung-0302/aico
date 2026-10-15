import { Injectable, Logger } from '@nestjs/common'
import { VACCINE_PRESETS } from '@miri-pet/shared'
import { isUniqueViolation } from '../common/prisma/prisma-errors'
import type { NotificationLogKind, VaccineType } from '../generated/prisma'
import { type PushNotice, PushService } from '../notifications/push.service'
import { PrismaService } from '../prisma/prisma.service'
import { addDays, kstToday, toDbDate } from './kst-date'

export type ReminderTarget = { kind: NotificationLogKind; dueOn: string; daysLeft: number }
export type ReminderRunResult = { today: string; candidates: number; sent: number; skipped: number }

type Candidate = {
  id: string
  type: VaccineType
  customName: string | null
  pet: { id: string; name: string; ownerId: string }
}

// D6: 예약 알림을 저장하지 않고 매일 "KST 오늘 + 7일 / + 1일"이 다음 접종일인 기록을 조회한다
export const reminderTargets = (now: Date): ReminderTarget[] => {
  const today = kstToday(now)
  return [
    { kind: 'VACCINATION_D7', dueOn: addDays(today, 7), daysLeft: 7 },
    { kind: 'VACCINATION_D1', dueOn: addDays(today, 1), daysLeft: 1 },
  ]
}

const PRESET_LABEL: ReadonlyMap<VaccineType, string> = new Map(VACCINE_PRESETS.map((p) => [p.type, p.label]))

export const vaccineLabel = (type: VaccineType, customName: string | null): string =>
  type === 'ETC' ? (customName ?? '접종') : (PRESET_LABEL.get(type) ?? type)

const formatMonthDay = (isoDate: string): string => {
  const [, month, day] = isoDate.split('-').map(Number)
  return `${month}월 ${day}일`
}

const toNotice = (candidate: Candidate, target: ReminderTarget): PushNotice => ({
  userId: candidate.pet.ownerId,
  title: target.daysLeft === 1 ? '내일 접종일이에요' : `접종 ${target.daysLeft}일 전이에요`,
  body: `${candidate.pet.name} ${vaccineLabel(candidate.type, candidate.customName)} 접종일이 ${formatMonthDay(target.dueOn)}이에요`,
  data: { kind: 'VACCINATION_DUE', vaccinationId: candidate.id, petId: candidate.pet.id },
})

@Injectable()
export class VaccinationReminderService {
  private readonly logger = new Logger(VaccinationReminderService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushService,
  ) {}

  // 같은 날 여러 번 실행해도 NotificationLog 유니크(kind, refId, dueOn)가 중복 발송을 막는다
  async runOnce(now: Date = new Date()): Promise<ReminderRunResult> {
    let notices: readonly PushNotice[] = []
    let candidates = 0
    // 순차 실행: 같은 접종이 D-7·D-1에 동시에 걸릴 일은 없지만 로그 insert 순서를 결정적으로 둔다
    for (const target of reminderTargets(now)) {
      const found = await this.findCandidates(target.dueOn)
      candidates += found.length
      for (const candidate of found) {
        if (await this.claim(candidate, target)) notices = [...notices, toNotice(candidate, target)]
      }
    }
    if (notices.length > 0) await this.push.sendToUsers(notices)
    const result = { today: kstToday(now), candidates, sent: notices.length, skipped: candidates - notices.length }
    this.logger.log(`[reminder] ${JSON.stringify(result)}`)
    return result
  }

  private findCandidates(dueOn: string): Promise<Candidate[]> {
    return this.prisma.vaccination.findMany({
      where: {
        nextDueOn: toDbDate(dueOn),
        pet: { owner: { status: { not: 'DELETED' }, notifyVaccination: true } },
      },
      select: { id: true, type: true, customName: true, pet: { select: { id: true, name: true, ownerId: true } } },
    })
  }

  // insert 성공 = 이번 실행이 발송 권한을 얻음. 유니크 충돌 = 이미 보낸 알림
  private async claim(candidate: Candidate, target: ReminderTarget): Promise<boolean> {
    try {
      await this.prisma.notificationLog.create({
        data: {
          userId: candidate.pet.ownerId,
          kind: target.kind,
          refId: candidate.id,
          dueOn: toDbDate(target.dueOn),
        },
      })
      return true
    } catch (error) {
      if (isUniqueViolation(error)) return false
      throw error
    }
  }
}
