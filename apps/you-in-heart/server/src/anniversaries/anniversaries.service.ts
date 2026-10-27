import { Injectable, NotFoundException } from '@nestjs/common'
import {
  type AnniversaryListResponse,
  type AnniversaryRangeQuery,
  computeAnniversaries,
  type CreateCustomAnniversaryRequest,
  type CustomAnniversary,
  type CustomAnniversaryListResponse,
  type UpdateCustomAnniversaryRequest,
} from '@you-in-heart/shared'
import { fromDbDate, toDbDate } from '../common/dates/db-date'
import { PrismaService } from '../prisma/prisma.service'

const DAY_MS = 86_400_000

const CUSTOM_SELECT = { id: true, title: true, date: true } as const

type CustomRow = { id: string; title: string; date: Date }

export const toCustomAnniversary = ({ id, title, date }: CustomRow): CustomAnniversary => ({
  id,
  title,
  date: fromDbDate(date),
})

export const daysBetween = (from: string, to: string): number =>
  Math.round((toDbDate(to).getTime() - toDbDate(from).getTime()) / DAY_MS)

const notFound = () => new NotFoundException('기념일을 찾을 수 없어요')

// 커스텀 기념일만 저장한다(자동 기념일은 Couple.startedOn에서 계산). 모든 함수의 첫 인자는 CoupleGuard의 coupleId
@Injectable()
export class AnniversariesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(coupleId: string, { from, to }: AnniversaryRangeQuery): Promise<AnniversaryListResponse> {
    const couple = await this.prisma.couple.findFirst({ where: { id: coupleId }, select: { startedOn: true } })
    if (!couple) throw new NotFoundException('커플을 찾을 수 없어요')
    const customs = await this.findCustoms(coupleId)
    const items = computeAnniversaries({
      startedOn: couple.startedOn ? fromDbDate(couple.startedOn) : null,
      customs,
      today: from,
      horizonDays: daysBetween(from, to),
    })
    return { items }
  }

  async listCustom(coupleId: string): Promise<CustomAnniversaryListResponse> {
    return { items: await this.findCustoms(coupleId) }
  }

  // 작성자는 요청한 멤버(클라이언트 값을 받지 않는다)
  async create(coupleId: string, actorId: string, { title, date }: CreateCustomAnniversaryRequest) {
    const row = await this.prisma.anniversary.create({
      data: { coupleId, createdById: actorId, title, date: toDbDate(date) },
      select: CUSTOM_SELECT,
    })
    return toCustomAnniversary(row)
  }

  // 두 멤버 모두 수정할 수 있다. 다른 커플의 id는 404
  async update(coupleId: string, id: string, { title, date }: UpdateCustomAnniversaryRequest) {
    const { count } = await this.prisma.anniversary.updateMany({
      where: { id, coupleId },
      data: { ...(title !== undefined ? { title } : {}), ...(date !== undefined ? { date: toDbDate(date) } : {}) },
    })
    if (count === 0) throw notFound()
    const row = await this.prisma.anniversary.findFirst({ where: { id, coupleId }, select: CUSTOM_SELECT })
    if (!row) throw notFound()
    return toCustomAnniversary(row)
  }

  async remove(coupleId: string, id: string): Promise<void> {
    const { count } = await this.prisma.anniversary.deleteMany({ where: { id, coupleId } })
    if (count === 0) throw notFound()
  }

  private async findCustoms(coupleId: string): Promise<CustomAnniversary[]> {
    const rows = await this.prisma.anniversary.findMany({
      where: { coupleId },
      select: CUSTOM_SELECT,
      orderBy: [{ date: 'asc' }, { id: 'asc' }],
    })
    return rows.map(toCustomAnniversary)
  }
}
