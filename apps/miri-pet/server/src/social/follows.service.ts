import { BadRequestException, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { CursorQuery, FollowResult, UserPage, UserSearchQuery, UserSummary } from '@miri-pet/shared'
import { toUserSummary, USER_SUMMARY_SELECT } from '../common/user-summary'
import { userNotFound, VISIBLE_USER_WHERE } from '../common/visible-user'
import { EventsService } from '../events/events.service'
import { BlockService } from '../moderation/block.service'
import { InAppNotificationService } from '../notifications/in-app-notification.service'
import { PrismaService } from '../prisma/prisma.service'

type Direction = 'followers' | 'following'

// followers: 이 사용자를 팔로우하는 사람(follower 쪽), following: 이 사용자가 팔로우하는 사람(followee 쪽)
const SIDE = {
  followers: { owner: 'followeeId', other: 'followerId', relation: 'follower' },
  following: { owner: 'followerId', other: 'followeeId', relation: 'followee' },
} as const

// LIKE 패턴 메타문자(%, _, \)를 이스케이프해 접두어 검색으로만 동작하게 한다
const escapeLike = (text: string): string => text.replace(/[\\%_]/g, (char) => `\\${char}`)

const invalidCursor = (): BadRequestException => new BadRequestException('잘못된 커서예요')

@Injectable()
export class FollowsService {
  private readonly baseUrl: string

  constructor(
    private readonly prisma: PrismaService,
    private readonly blocks: BlockService,
    private readonly notifications: InAppNotificationService,
    private readonly events: EventsService,
    config: ConfigService,
  ) {
    this.baseUrl = config.get<string>('r2.publicBaseUrl') ?? ''
  }

  async follow(followerId: string, followeeId: string): Promise<FollowResult> {
    if (followerId === followeeId) throw new BadRequestException('자기 자신은 팔로우할 수 없어요')
    await this.assertVisible(followerId, followeeId)
    const { count } = await this.prisma.follow.createMany({ data: [{ followerId, followeeId }], skipDuplicates: true })
    if (count > 0) {
      this.events.capture(followerId, 'follow_created')
      await this.notifications.notify({ kind: 'FOLLOW', recipientId: followeeId, actorId: followerId, refId: null })
    }
    return { isFollowing: true }
  }

  async unfollow(followerId: string, followeeId: string): Promise<FollowResult> {
    await this.prisma.follow.deleteMany({ where: { followerId, followeeId } })
    return { isFollowing: false }
  }

  // 최신 팔로우순. 커서 = 마지막 항목의 사용자 id, 차단 관계·비활성 사용자는 빠진다
  async list(viewerId: string, userId: string, direction: Direction, query: CursorQuery): Promise<UserPage> {
    if (viewerId !== userId) await this.assertVisible(viewerId, userId)
    const side = SIDE[direction]
    const hidden = await this.blocks.hiddenUserIds(viewerId)
    const after = await this.cursorRow(userId, direction, query.cursor, hidden)
    const rows = await this.prisma.follow.findMany({
      where: {
        [side.owner]: userId,
        [side.other]: { notIn: [...hidden] },
        [side.relation]: VISIBLE_USER_WHERE,
        ...(after
          ? {
              OR: [
                { createdAt: { lt: after.createdAt } },
                { createdAt: after.createdAt, [side.other]: { lt: after.otherId } },
              ],
            }
          : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { [side.other]: 'desc' }],
      take: query.limit + 1,
      select: { follower: { select: USER_SUMMARY_SELECT }, followee: { select: USER_SUMMARY_SELECT } },
    })
    const users = rows.map((row) => row[side.relation])
    const items = users.slice(0, query.limit).map((user) => toUserSummary(user, this.baseUrl))
    const hasMore = users.length > query.limit
    return { items, nextCursor: hasMore ? (items[items.length - 1]?.id ?? null) : null }
  }

  // 닉네임 접두어 검색(대소문자 무시). 차단 관계·비활성 사용자 제외
  async search(viewerId: string, { nickname, limit }: UserSearchQuery): Promise<{ items: UserSummary[] }> {
    const hidden = await this.blocks.hiddenUserIds(viewerId)
    const users = await this.prisma.user.findMany({
      where: {
        ...VISIBLE_USER_WHERE,
        id: { notIn: [...hidden] },
        nickname: { startsWith: escapeLike(nickname), mode: 'insensitive' },
      },
      orderBy: { nickname: 'asc' },
      take: limit,
      select: USER_SUMMARY_SELECT,
    })
    return { items: users.map((user) => toUserSummary(user, this.baseUrl)) }
  }

  // GET /users/:id와 같은 조건·같은 404 (차단 양방향·정지·탈퇴·숨김)
  private async assertVisible(viewerId: string, userId: string): Promise<void> {
    if (await this.blocks.isBlockedEitherWay(viewerId, userId)) throw userNotFound()
    const user = await this.prisma.user.findFirst({
      where: { id: userId, ...VISIBLE_USER_WHERE },
      select: { id: true },
    })
    if (!user) throw userNotFound()
  }

  // 커서 행도 목록과 같은 조건(차단 관계·비활성 제외)으로 찾는다 → 숨은 사용자 커서는 없는 커서와 같은 400
  private async cursorRow(
    userId: string,
    direction: Direction,
    cursor: string | undefined,
    hidden: ReadonlySet<string>,
  ) {
    if (!cursor) return null
    if (hidden.has(cursor)) throw invalidCursor()
    const side = SIDE[direction]
    const row = await this.prisma.follow.findFirst({
      where: { [side.owner]: userId, [side.other]: cursor, [side.relation]: VISIBLE_USER_WHERE },
      select: { createdAt: true },
    })
    if (!row) throw invalidCursor()
    return { createdAt: row.createdAt, otherId: cursor }
  }
}
