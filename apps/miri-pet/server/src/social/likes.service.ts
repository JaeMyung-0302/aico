import { Injectable } from '@nestjs/common'
import type { LikeResult } from '@miri-pet/shared'
import { BlockService } from '../moderation/block.service'
import { InAppNotificationService } from '../notifications/in-app-notification.service'
import { PostsRepository } from '../posts/posts.repository'
import { postNotFound } from '../posts/posts.service'
import { PrismaService } from '../prisma/prisma.service'

// 좋아요는 PUT(누르기)/DELETE(취소)로 멱등. 카운터는 실제로 행이 생기거나 지워졌을 때만 같은 트랜잭션에서 증감
@Injectable()
export class LikesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly posts: PostsRepository,
    private readonly blocks: BlockService,
    private readonly notifications: InAppNotificationService,
  ) {}

  async like(userId: string, postId: string): Promise<LikeResult> {
    const post = await this.findTarget(userId, postId)
    const { isInserted, likeCount } = await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.like.createMany({ data: [{ userId, postId }], skipDuplicates: true })
      const updated =
        count > 0
          ? await tx.post.update({
              where: { id: postId },
              data: { likeCount: { increment: 1 } },
              select: { likeCount: true },
            })
          : await tx.post.findUniqueOrThrow({ where: { id: postId }, select: { likeCount: true } })
      return { isInserted: count > 0, likeCount: updated.likeCount }
    })
    if (isInserted) {
      await this.notifications.notify({
        kind: 'LIKE',
        recipientId: post.authorId,
        actorId: userId,
        refId: postId,
        postId,
      })
    }
    return { isLiked: true, likeCount }
  }

  async unlike(userId: string, postId: string): Promise<LikeResult> {
    await this.findTarget(userId, postId)
    const likeCount = await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.like.deleteMany({ where: { userId, postId } })
      const updated =
        count > 0
          ? await tx.post.update({
              where: { id: postId },
              data: { likeCount: { decrement: 1 } },
              select: { likeCount: true },
            })
          : await tx.post.findUniqueOrThrow({ where: { id: postId }, select: { likeCount: true } })
      return updated.likeCount
    })
    return { isLiked: false, likeCount }
  }

  private async findTarget(userId: string, postId: string) {
    const hidden = await this.blocks.hiddenUserIds(userId)
    const post = await this.posts.findVisibleAuthor(userId, postId, hidden)
    if (!post) throw postNotFound()
    return post
  }
}
