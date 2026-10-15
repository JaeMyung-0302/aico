import { BadRequestException, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { BlockList } from '@miri-pet/shared'
import { getRequestContext } from '../common/request-context/request-context'
import { toUserSummary, USER_SUMMARY_SELECT } from '../common/user-summary'
import { userNotFound, VISIBLE_USER_WHERE } from '../common/visible-user'
import { PrismaService } from '../prisma/prisma.service'

// 차단 공통 필터. 피드·댓글·DM·검색·프로필 조회는 hiddenUserIds(viewerId)를 필수 인자로 받는다
@Injectable()
export class BlockService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private async loadHiddenUserIds(viewerId: string): Promise<ReadonlySet<string>> {
    const rows = await this.prisma.block.findMany({
      where: { OR: [{ blockerId: viewerId }, { blockedId: viewerId }] },
      select: { blockerId: true, blockedId: true },
    })
    return new Set(rows.map((row) => (row.blockerId === viewerId ? row.blockedId : row.blockerId)))
  }

  // 내가 차단했거나 나를 차단한 사용자 id (양방향, 요청 단위 메모이즈)
  hiddenUserIds(viewerId: string): Promise<ReadonlySet<string>> {
    const memo = getRequestContext()?.hiddenUserIds
    const cached = memo?.get(viewerId)
    if (cached) return cached
    const loading = this.loadHiddenUserIds(viewerId)
    memo?.set(viewerId, loading)
    return loading
  }

  async isBlockedEitherWay(viewerId: string, otherId: string): Promise<boolean> {
    const hidden = await this.hiddenUserIds(viewerId)
    return hidden.has(otherId)
  }

  private invalidate(...userIds: string[]): void {
    const memo = getRequestContext()?.hiddenUserIds
    userIds.forEach((id) => memo?.delete(id))
  }

  async block(blockerId: string, blockedId: string): Promise<void> {
    if (blockerId === blockedId) throw new BadRequestException('자기 자신은 차단할 수 없어요')
    // GET /users/:id와 같은 조건·같은 404 → 차단 API로 정지·숨김 여부를 알아낼 수 없다
    const target = await this.prisma.user.findFirst({
      where: { id: blockedId, ...VISIBLE_USER_WHERE },
      select: { id: true },
    })
    if (!target) throw userNotFound()
    // 차단과 함께 서로의 팔로우 관계를 해제한다(Phase 4)
    await this.prisma.$transaction([
      this.prisma.block.createMany({ data: [{ blockerId, blockedId }], skipDuplicates: true }),
      this.prisma.follow.deleteMany({
        where: {
          OR: [
            { followerId: blockerId, followeeId: blockedId },
            { followerId: blockedId, followeeId: blockerId },
          ],
        },
      }),
    ])
    this.invalidate(blockerId, blockedId)
  }

  async unblock(blockerId: string, blockedId: string): Promise<void> {
    await this.prisma.block.deleteMany({ where: { blockerId, blockedId } })
    this.invalidate(blockerId, blockedId)
  }

  async list(blockerId: string): Promise<BlockList> {
    const rows = await this.prisma.block.findMany({
      where: { blockerId },
      orderBy: { createdAt: 'desc' },
      select: { blocked: { select: USER_SUMMARY_SELECT } },
    })
    const baseUrl = this.config.get<string>('r2.publicBaseUrl') ?? ''
    return { items: rows.map((row) => toUserSummary(row.blocked, baseUrl)) }
  }
}
