import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Conversation, ConversationListQuery, ConversationPage } from '@miri-pet/shared'
import { isUniqueViolation } from '../common/prisma/prisma-errors'
import { userNotFound, visibleUserWhereFor } from '../common/visible-user'
import type { MemberState, Prisma } from '../generated/prisma'
import { BlockService } from '../moderation/block.service'
import { PrismaService } from '../prisma/prisma.service'
import { orderPair } from './dm-rules'
import { MEMBER_CONVERSATION_SELECT, type MemberConversationRow, toConversationDto } from './dm-mapper'

export const NOT_A_MEMBER_MESSAGE = '참여하지 않은 대화예요'
export const CANNOT_MESSAGE_MESSAGE = '메시지를 보낼 수 없는 사용자예요'

const notAMember = () => new ForbiddenException(NOT_A_MEMBER_MESSAGE)
export const cannotMessage = () => new ForbiddenException(CANNOT_MESSAGE_MESSAGE)

export type Membership = {
  conversationId: string
  peerId: string
  myState: MemberState
  myHiddenAt: Date | null
  // 탈퇴한 상대는 멤버 행이 없다
  peer: { state: MemberState; hiddenAt: Date | null } | null
}

@Injectable()
export class ConversationsService {
  private readonly baseUrl: string

  constructor(
    private readonly prisma: PrismaService,
    private readonly blocks: BlockService,
    config: ConfigService,
  ) {
    this.baseUrl = config.get<string>('r2.publicBaseUrl') ?? ''
  }

  // 대화 멤버가 아니면(없는 대화 포함) 403
  async requireMember(userId: string, conversationId: string): Promise<Membership> {
    const member = await this.prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
      select: {
        state: true,
        hiddenAt: true,
        conversation: {
          select: {
            userLowId: true,
            userHighId: true,
            members: { select: { userId: true, state: true, hiddenAt: true } },
          },
        },
      },
    })
    if (!member) throw notAMember()
    const { userLowId, userHighId, members } = member.conversation
    const peerId = userLowId === userId ? userHighId : userLowId
    const peer = members.find((row) => row.userId === peerId)
    return {
      conversationId,
      peerId,
      myState: member.state,
      myHiddenAt: member.hiddenAt,
      peer: peer ? { state: peer.state, hiddenAt: peer.hiddenAt } : null,
    }
  }

  // 차단 관계(양방향)면 403
  async assertNotBlocked(userId: string, peerId: string): Promise<void> {
    if (await this.blocks.isBlockedEitherWay(userId, peerId)) throw cannotMessage()
  }

  // POST /dm/conversations: 쌍당 1개. 맞팔이면 둘 다 ACCEPTED, 아니면 상대는 REQUEST(메시지 요청함)
  async open(userId: string, peerId: string): Promise<Conversation> {
    if (userId === peerId) throw new BadRequestException('자기 자신에게는 메시지를 보낼 수 없어요')
    await this.assertNotBlocked(userId, peerId)
    const peer = await this.prisma.user.findFirst({
      where: { id: peerId, ...visibleUserWhereFor(userId) },
      select: { id: true },
    })
    if (!peer) throw userNotFound()

    const pair = orderPair(userId, peerId)
    const existing = await this.prisma.conversation.findUnique({
      where: { userLowId_userHighId: pair },
      select: { id: true },
    })
    const conversationId = existing?.id ?? (await this.create(userId, peerId, pair))
    // 내가 숨겼던 대화를 다시 열면 내 목록에 다시 보인다
    await this.prisma.conversationMember.updateMany({
      where: { conversationId, userId, hiddenAt: { not: null } },
      data: { hiddenAt: null },
    })
    return this.get(userId, conversationId)
  }

  private async create(
    userId: string,
    peerId: string,
    pair: { userLowId: string; userHighId: string },
  ): Promise<string> {
    const follows = await this.prisma.follow.count({
      where: {
        OR: [
          { followerId: userId, followeeId: peerId },
          { followerId: peerId, followeeId: userId },
        ],
      },
    })
    const peerState: MemberState = follows === 2 ? 'ACCEPTED' : 'REQUEST'
    try {
      const created = await this.prisma.conversation.create({
        data: {
          ...pair,
          members: {
            create: [
              { userId, state: 'ACCEPTED' },
              { userId: peerId, state: peerState },
            ],
          },
        },
        select: { id: true },
      })
      return created.id
    } catch (error) {
      // 두 사람이 동시에 열었을 때: 먼저 만든 대화를 쓴다
      if (!isUniqueViolation(error)) throw error
      const winner = await this.prisma.conversation.findUniqueOrThrow({
        where: { userLowId_userHighId: pair },
        select: { id: true },
      })
      return winner.id
    }
  }

  async get(userId: string, conversationId: string): Promise<Conversation> {
    const { peerId } = await this.requireMember(userId, conversationId)
    await this.assertNotBlocked(userId, peerId)
    const row = await this.prisma.conversationMember.findUniqueOrThrow({
      where: { conversationId_userId: { conversationId, userId } },
      select: MEMBER_CONVERSATION_SELECT,
    })
    const unread = await this.unreadCounts(userId, [conversationId])
    return toConversationDto(row, userId, unread.get(conversationId) ?? 0, this.baseUrl)
  }

  // 12 DmInbox: 최근 메시지순. 메시지 없는 대화·내가 숨긴 대화·차단 관계 상대는 빠진다. 커서 = 마지막 대화 id
  async list(userId: string, { state, cursor, limit }: ConversationListQuery): Promise<ConversationPage> {
    const hidden = [...(await this.blocks.hiddenUserIds(userId))]
    const after = await this.cursorConversation(userId, cursor)
    const conversationWhere: Prisma.ConversationWhereInput = {
      lastMessageAt: { not: null },
      userLowId: { notIn: hidden },
      userHighId: { notIn: hidden },
      ...(after
        ? {
            OR: [
              { lastMessageAt: { lt: after.lastMessageAt } },
              { lastMessageAt: after.lastMessageAt, id: { lt: after.id } },
            ],
          }
        : {}),
    }
    const rows: MemberConversationRow[] = await this.prisma.conversationMember.findMany({
      where: { userId, state, hiddenAt: null, conversation: conversationWhere },
      orderBy: [{ conversation: { lastMessageAt: 'desc' } }, { conversationId: 'desc' }],
      take: limit + 1,
      select: MEMBER_CONVERSATION_SELECT,
    })
    const pageRows = rows.slice(0, limit)
    const unread = await this.unreadCounts(
      userId,
      pageRows.map((row) => row.conversation.id),
    )
    const items = pageRows.map((row) =>
      toConversationDto(row, userId, unread.get(row.conversation.id) ?? 0, this.baseUrl),
    )
    const hasMore = rows.length > limit
    return { items, nextCursor: hasMore ? (items[items.length - 1]?.id ?? null) : null }
  }

  // 요청 수락: 요청함 → 대화 탭. 이미 수락했으면 그대로
  async accept(userId: string, conversationId: string): Promise<Conversation> {
    const { peerId } = await this.requireMember(userId, conversationId)
    await this.assertNotBlocked(userId, peerId)
    await this.prisma.$transaction([
      this.prisma.conversationMember.update({
        where: { conversationId_userId: { conversationId, userId } },
        data: { state: 'ACCEPTED', hiddenAt: null },
      }),
      this.clearDmRequestNotices(userId, peerId),
    ])
    return this.get(userId, conversationId)
  }

  // 나에게서 숨김(요청 거절 포함). 상대 화면에는 영향 없음
  async hide(userId: string, conversationId: string): Promise<void> {
    const { peerId } = await this.requireMember(userId, conversationId)
    await this.prisma.$transaction([
      this.prisma.conversationMember.update({
        where: { conversationId_userId: { conversationId, userId } },
        data: { hiddenAt: new Date() },
      }),
      this.clearDmRequestNotices(userId, peerId),
    ])
  }

  // 요청을 수락·거절하면 그 상대의 DM_REQUEST 알림을 지운다(요청이 끝났으므로 다음 요청은 다시 알릴 수 있다)
  private clearDmRequestNotices(userId: string, peerId: string) {
    return this.prisma.notification.deleteMany({ where: { userId, actorId: peerId, kind: 'DM_REQUEST' } })
  }

  // 대화별 안 읽은 수: 내가 보내지 않았고(탈퇴자 메시지 포함) 숨김이 아니며 내 lastReadMessageId 이후인 메시지
  private async unreadCounts(userId: string, conversationIds: readonly string[]): Promise<ReadonlyMap<string, number>> {
    if (conversationIds.length === 0) return new Map()
    const rows = await this.prisma.$queryRaw<Array<{ id: string; count: number }>>`
      SELECT m."conversationId" AS id, count(*)::int AS count
      FROM "Message" m
      JOIN "ConversationMember" cm ON cm."conversationId" = m."conversationId" AND cm."userId" = ${userId}::uuid
      WHERE m."conversationId" = ANY(${[...conversationIds]}::uuid[])
        AND m."hiddenAt" IS NULL
        AND m."senderId" IS DISTINCT FROM ${userId}::uuid
        AND (cm."lastReadMessageId" IS NULL OR m.id > cm."lastReadMessageId")
      GROUP BY m."conversationId"`
    return new Map(rows.map((row) => [row.id, row.count]))
  }

  // 보안 리뷰 LOW-3: 내가 멤버인 대화만 커서로 쓴다(남의 대화 lastMessageAt을 엿볼 수 없게). 아니면 잘못된 커서와 같은 400
  private async cursorConversation(userId: string, cursor: string | undefined) {
    if (!cursor) return null
    const row = await this.prisma.conversation.findFirst({
      where: { id: cursor, members: { some: { userId } } },
      select: { id: true, lastMessageAt: true },
    })
    if (!row?.lastMessageAt) throw new BadRequestException('잘못된 커서예요')
    return { id: row.id, lastMessageAt: row.lastMessageAt }
  }
}
