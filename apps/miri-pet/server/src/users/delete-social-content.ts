import type { Prisma } from '../generated/prisma'

// 탈퇴(Phase 4): 내 게시물·댓글·알림 하드 삭제.
// - 내 게시물: PostImage·PostPet·Like·Comment는 FK cascade. 이미지 Media 행·R2 객체는 "사용자 소유 미디어 전체 파기"가 처리한다
// - 남의 게시물에 단 내 댓글: 지운 뒤 그 게시물들의 commentCount를 실제 수(삭제·숨김 제외)로 다시 맞춘다
// - 나에게 온 알림·내가 만든 알림
export const deleteSocialContent = async (tx: Prisma.TransactionClient, userId: string): Promise<void> => {
  await tx.post.deleteMany({ where: { authorId: userId } })
  const commented = await tx.comment.findMany({
    where: { authorId: userId },
    distinct: ['postId'],
    select: { postId: true },
  })
  await tx.comment.deleteMany({ where: { authorId: userId } })
  const postIds = commented.map((row) => row.postId)
  if (postIds.length > 0) {
    await tx.$executeRaw`
      UPDATE "Post" p SET "commentCount" = (
        SELECT count(*)::int FROM "Comment" c
        WHERE c."postId" = p.id AND c."deletedAt" IS NULL AND c."hiddenAt" IS NULL
      )
      WHERE p.id = ANY(${postIds}::uuid[])`
  }
  await tx.notification.deleteMany({ where: { OR: [{ userId }, { actorId: userId }] } })
}
