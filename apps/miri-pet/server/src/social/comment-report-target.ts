import { visibleUserWhereFor } from '../common/visible-user'
import type { ReportTargetHandler } from '../moderation/report.service'
import type { PrismaService } from '../prisma/prisma.service'
import { COMMENT_NOT_FOUND_MESSAGE } from './comments.service'

type Prisma = Pick<PrismaService, 'comment' | '$transaction'>

// COMMENT 신고: 댓글·게시물 작성자가 모두 보이는 사용자여야 한다(비활성·신고자와 차단 관계면 404).
// 숨김/해제 시 commentCount도 같은 트랜잭션에서 맞춘다
export const createCommentReportTarget = (prisma: Prisma): ReportTargetHandler => ({
  notFoundMessage: COMMENT_NOT_FOUND_MESSAGE,
  findOwnerId: async (targetId, reporterId?: string) => {
    const visibleUser = visibleUserWhereFor(reporterId)
    const comment = await prisma.comment.findFirst({
      where: {
        id: targetId,
        hiddenAt: null,
        deletedAt: null,
        author: visibleUser,
        post: { hiddenAt: null, deletedAt: null, author: visibleUser },
      },
      select: { authorId: true },
    })
    return comment?.authorId ?? null
  },
  hide: (targetId) => toggleHidden(prisma, targetId, true),
  unhide: async (targetId) => {
    await toggleHidden(prisma, targetId, false)
  },
})

const toggleHidden = (prisma: Prisma, commentId: string, isHiding: boolean): Promise<boolean> =>
  prisma.$transaction(async (tx) => {
    const { count } = await tx.comment.updateMany({
      where: { id: commentId, deletedAt: null, hiddenAt: isHiding ? null : { not: null } },
      data: { hiddenAt: isHiding ? new Date() : null },
    })
    if (count === 0) return false
    const comment = await tx.comment.findUniqueOrThrow({ where: { id: commentId }, select: { postId: true } })
    await tx.post.update({
      where: { id: comment.postId },
      data: { commentCount: isHiding ? { decrement: 1 } : { increment: 1 } },
    })
    return true
  })
