import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { CursorQuery, Notification, NotificationPage, UnreadCount } from '@miri-pet/shared'
import { toUserSummary, USER_SUMMARY_SELECT } from '../common/user-summary'
import { VISIBLE_USER_WHERE } from '../common/visible-user'
import type { Prisma } from '../generated/prisma'
import { publicUrlsOf } from '../media/media-keys'
import { BlockService } from '../moderation/block.service'
import { cursorBefore, toPage } from '../posts/feed-cursor'
import { PrismaService } from '../prisma/prisma.service'

type Target = { postId: string; thumbUrl: string | null; preview: string | null }

const NOTIFICATION_SELECT = {
  id: true,
  kind: true,
  refId: true,
  readAt: true,
  createdAt: true,
  actor: { select: { ...USER_SUMMARY_SELECT, status: true, hiddenAt: true } },
} as const

// 정지·탈퇴·신고 숨김 actor는 알 수 없는 사용자(null)로 내려 상태를 노출하지 않는다
const isVisibleActor = (actor: { status: string; hiddenAt: Date | null }): boolean =>
  actor.status === VISIBLE_USER_WHERE.status && actor.hiddenAt === null

// 07 알림함. 차단 관계(양방향) actor의 알림은 목록·안 읽음 수에서 빠진다
@Injectable()
export class NotificationsService {
  private readonly baseUrl: string

  constructor(
    private readonly prisma: PrismaService,
    private readonly blocks: BlockService,
    config: ConfigService,
  ) {
    this.baseUrl = config.get<string>('r2.publicBaseUrl') ?? ''
  }

  private async visibleWhere(userId: string): Promise<Prisma.NotificationWhereInput> {
    const hidden = await this.blocks.hiddenUserIds(userId)
    if (hidden.size === 0) return { userId }
    return { userId, OR: [{ actorId: null }, { actorId: { notIn: [...hidden] } }] }
  }

  async list(userId: string, { cursor, limit }: CursorQuery): Promise<NotificationPage> {
    const rows = await this.prisma.notification.findMany({
      where: { ...(await this.visibleWhere(userId)), ...cursorBefore(cursor) },
      orderBy: { id: 'desc' },
      take: limit + 1,
      select: NOTIFICATION_SELECT,
    })
    const page = toPage(rows, limit)
    const targets = await this.resolveTargets(page.items)
    const items: Notification[] = page.items.map((row) => {
      const target = row.refId ? targets.get(row.refId) : undefined
      return {
        id: row.id,
        kind: row.kind,
        actor: row.actor && isVisibleActor(row.actor) ? toUserSummary(row.actor, this.baseUrl) : null,
        refId: row.refId,
        postId: target?.postId ?? null,
        thumbUrl: target?.thumbUrl ?? null,
        preview: target?.preview ?? null,
        readAt: row.readAt?.toISOString() ?? null,
        createdAt: row.createdAt.toISOString(),
      }
    })
    return { items, nextCursor: page.nextCursor }
  }

  // 부분 인덱스 Notification_unread_idx(userId) WHERE readAt IS NULL
  async unreadCount(userId: string): Promise<UnreadCount> {
    const count = await this.prisma.notification.count({
      where: { ...(await this.visibleWhere(userId)), readAt: null },
    })
    return { count }
  }

  async readAll(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } })
  }

  // refId → 이동할 게시물. LIKE는 postId, COMMENT는 commentId. 숨김·삭제된 대상은 이동하지 않는다(null)
  private async resolveTargets(
    rows: ReadonlyArray<{ kind: string; refId: string | null }>,
  ): Promise<ReadonlyMap<string, Target>> {
    const refsOf = (kind: string) => rows.flatMap((row) => (row.kind === kind && row.refId ? [row.refId] : []))
    const comments = await this.prisma.comment.findMany({
      where: { id: { in: refsOf('COMMENT') }, hiddenAt: null, deletedAt: null },
      select: { id: true, postId: true, body: true },
    })
    const postIds = [...refsOf('LIKE'), ...comments.map((comment) => comment.postId)]
    const posts = await this.prisma.post.findMany({
      where: { id: { in: postIds }, hiddenAt: null, deletedAt: null },
      select: {
        id: true,
        images: {
          where: { order: 0 },
          select: { media: { select: { id: true, bucket: true, key: true, status: true } } },
        },
      },
    })
    const thumbs = new Map(
      posts.map((post) => [post.id, post.images[0] ? publicUrlsOf(this.baseUrl, post.images[0].media).thumbUrl : null]),
    )
    const likeTargets = refsOf('LIKE').flatMap((postId) =>
      thumbs.has(postId) ? [[postId, { postId, thumbUrl: thumbs.get(postId) ?? null, preview: null }] as const] : [],
    )
    const commentTargets = comments.flatMap((comment) =>
      thumbs.has(comment.postId)
        ? [
            [
              comment.id,
              { postId: comment.postId, thumbUrl: thumbs.get(comment.postId) ?? null, preview: comment.body },
            ] as const,
          ]
        : [],
    )
    return new Map<string, Target>([...likeTargets, ...commentTargets])
  }
}
