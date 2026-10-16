import { visibleUserWhereFor } from '../common/visible-user'
import type { ReportTargetHandler } from '../moderation/report.service'
import type { PrismaService } from '../prisma/prisma.service'
import { POST_NOT_FOUND_MESSAGE } from './posts.service'

type PostDelegate = Pick<PrismaService['post'], 'findFirst' | 'updateMany'>

// POST 신고: 대상은 GET /posts/:id로 보이는 게시물(작성자 비활성·신고자와 차단 관계면 같은 404), 자격 신고 3건이면 hiddenAt
export const createPostReportTarget = (posts: PostDelegate): ReportTargetHandler => ({
  notFoundMessage: POST_NOT_FOUND_MESSAGE,
  findOwnerId: async (targetId, reporterId?: string) => {
    const post = await posts.findFirst({
      where: { id: targetId, hiddenAt: null, deletedAt: null, author: visibleUserWhereFor(reporterId) },
      select: { authorId: true },
    })
    return post?.authorId ?? null
  },
  hide: async (targetId) => {
    const { count } = await posts.updateMany({
      where: { id: targetId, hiddenAt: null },
      data: { hiddenAt: new Date() },
    })
    return count > 0
  },
  unhide: async (targetId) => {
    await posts.updateMany({ where: { id: targetId }, data: { hiddenAt: null } })
  },
})
