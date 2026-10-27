import { Injectable, NotFoundException } from '@nestjs/common'
import type { CoupleSummary, MeResponse, UpdateMeRequest } from '@you-in-heart/shared'
import { fromDbDate } from '../common/dates/db-date'
import { PrismaService } from '../prisma/prisma.service'
import { ConsentService } from './consent.service'

const notFound = () => new NotFoundException('사용자를 찾을 수 없어요')

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly consents: ConsentService,
  ) {}

  async getMe(userId: string): Promise<MeResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, displayName: true },
    })
    if (!user) throw notFound()
    const [consents, couple] = await Promise.all([this.consents.status(userId), this.coupleSummary(userId)])
    return { id: user.id, displayName: user.displayName, consents, couple }
  }

  // 미연결이면 null. 유예 중(UNLINKING)이면 앱이 purgeAfter로 남은 기간을 보여 준다
  private async coupleSummary(userId: string): Promise<CoupleSummary | null> {
    const member = await this.prisma.coupleMember.findUnique({
      where: { userId },
      select: { couple: { select: { id: true, status: true, startedOn: true, purgeAfter: true } } },
    })
    if (!member) return null
    const { id, status, startedOn, purgeAfter } = member.couple
    return {
      id,
      status,
      startedOn: startedOn ? fromDbDate(startedOn) : null,
      purgeAfter: purgeAfter?.toISOString() ?? null,
    }
  }

  async updateMe(userId: string, body: UpdateMeRequest): Promise<MeResponse> {
    await this.prisma.user.update({ where: { id: userId }, data: { displayName: body.displayName } })
    return this.getMe(userId)
  }
}
