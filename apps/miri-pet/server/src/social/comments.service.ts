import { Injectable, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Comment, CommentPage, CreateCommentRequest, CursorQuery } from '@miri-pet/shared'
import { toUserSummary, USER_SUMMARY_SELECT } from '../common/user-summary'
import { VISIBLE_USER_WHERE } from '../common/visible-user'
import { BlockService } from '../moderation/block.service'
import { InAppNotificationService } from '../notifications/in-app-notification.service'
import { cursorAfter, toPage } from '../posts/feed-cursor'
import { PostsRepository } from '../posts/posts.repository'
import { postNotFound } from '../posts/posts.service'
import { PrismaService } from '../prisma/prisma.service'

export const COMMENT_NOT_FOUND_MESSAGE = '댓글을 찾을 수 없어요'

const COMMENT_SELECT = {
  id: true,
  postId: true,
  body: true,
  createdAt: true,
  author: { select: USER_SUMMARY_SELECT },
} as const

type CommentRow = {
  id: string
  postId: string
  body: string
  createdAt: Date
  author: Parameters<typeof toUserSummary>[0]
}

// commentCount = 삭제·숨김이 아닌 댓글 수 (작성·삭제·신고 숨김/해제 때 같은 트랜잭션에서 증감)
@Injectable()
export class CommentsService {
  private readonly baseUrl: string

  constructor(
    private readonly prisma: PrismaService,
    private readonly posts: PostsRepository,
    private readonly blocks: BlockService,
    private readonly notifications: InAppNotificationService,
    config: ConfigService,
  ) {
    this.baseUrl = config.get<string>('r2.publicBaseUrl') ?? ''
  }

  // 오래된순. 차단 관계(양방향)·비활성 작성자의 댓글은 빠진다(본인 댓글은 보인다)
  async list(viewerId: string, postId: string, { cursor, limit }: CursorQuery): Promise<CommentPage> {
    const hidden = await this.blocks.hiddenUserIds(viewerId)
    if (!(await this.posts.findVisibleAuthor(viewerId, postId, hidden))) throw postNotFound()
    const rows = await this.prisma.comment.findMany({
      where: {
        postId,
        hiddenAt: null,
        deletedAt: null,
        ...cursorAfter(cursor),
        AND: [{ authorId: { notIn: [...hidden] } }, { OR: [{ authorId: viewerId }, { author: VISIBLE_USER_WHERE }] }],
      },
      orderBy: { id: 'asc' },
      take: limit + 1,
      select: COMMENT_SELECT,
    })
    const page = toPage(rows, limit)
    return { items: page.items.map((row) => this.toDto(row)), nextCursor: page.nextCursor }
  }

  async create(authorId: string, postId: string, { body }: CreateCommentRequest): Promise<Comment> {
    const hidden = await this.blocks.hiddenUserIds(authorId)
    const post = await this.posts.findVisibleAuthor(authorId, postId, hidden)
    if (!post) throw postNotFound()
    const [row] = await this.prisma.$transaction([
      this.prisma.comment.create({ data: { postId, authorId, body }, select: COMMENT_SELECT }),
      this.prisma.post.update({ where: { id: postId }, data: { commentCount: { increment: 1 } } }),
    ])
    await this.notifications.notify({
      kind: 'COMMENT',
      recipientId: post.authorId,
      actorId: authorId,
      refId: row.id,
      postId,
      preview: body,
    })
    return this.toDto(row)
  }

  // 댓글 작성자 또는 게시물 주인만 지울 수 있다(그 외·이미 삭제 → 404)
  async remove(viewerId: string, commentId: string): Promise<void> {
    const comment = await this.prisma.comment.findFirst({
      where: { id: commentId, deletedAt: null, OR: [{ authorId: viewerId }, { post: { authorId: viewerId } }] },
      select: { id: true, postId: true },
    })
    if (!comment) throw new NotFoundException(COMMENT_NOT_FOUND_MESSAGE)
    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.comment.updateMany({
        where: { id: commentId, deletedAt: null, hiddenAt: null },
        data: { deletedAt: new Date() },
      })
      if (count > 0) {
        await tx.post.update({ where: { id: comment.postId }, data: { commentCount: { decrement: 1 } } })
        return
      }
      // 이미 숨겨진 댓글은 카운터에서 빠져 있으므로 삭제 표시만 한다
      await tx.comment.updateMany({ where: { id: commentId, deletedAt: null }, data: { deletedAt: new Date() } })
    })
  }

  private toDto(row: CommentRow): Comment {
    return {
      id: row.id,
      postId: row.postId,
      body: row.body,
      author: toUserSummary(row.author, this.baseUrl),
      createdAt: row.createdAt.toISOString(),
    }
  }
}
