import { Injectable, Logger } from '@nestjs/common'
import { isUniqueViolation } from '../common/prisma/prisma-errors'
import { BlockService } from '../moderation/block.service'
import { PrismaService } from '../prisma/prisma.service'
import { LIKE_PUSH_WINDOW_MS, type SocialKind, SocialPushService } from './social-push.service'

export type SocialNotice = {
  kind: SocialKind
  recipientId: string
  actorId: string
  // LIKE: postId, COMMENT: commentId, FOLLOW: null, DM_REQUEST: conversationId
  refId: string | null
  postId?: string
  preview?: string
}

// 좋아요·댓글·팔로우·DM 요청 → Notification 행 + 소셜 푸시(DM 요청 제외). 실패는 로그만 남긴다(원래 동작은 이미 커밋됨)
@Injectable()
export class InAppNotificationService {
  private readonly logger = new Logger(InAppNotificationService.name)
  clock: () => Date = () => new Date()

  constructor(
    private readonly prisma: PrismaService,
    private readonly blocks: BlockService,
    private readonly socialPush: SocialPushService,
  ) {}

  async notify(notice: SocialNotice): Promise<void> {
    try {
      if (!(await this.shouldNotify(notice))) return
      const row = await this.prisma.notification.create({
        data: { userId: notice.recipientId, actorId: notice.actorId, kind: notice.kind, refId: notice.refId },
        select: { id: true },
      })
      // DM 요청은 수락 전까지 푸시하지 않는다(알림함·요청함에만 보인다)
      if (notice.kind === 'DM_REQUEST') return
      await this.socialPush.send({ ...notice, notificationId: row.id })
    } catch (error) {
      // DM_REQUEST 부분 유니크(userId, actorId) 경쟁: 다른 요청이 먼저 만들었으므로 할 일이 없다
      if (notice.kind === 'DM_REQUEST' && isUniqueViolation(error)) return
      this.logger.warn(
        `[notification] ${notice.kind} → ${notice.recipientId} failed: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  private async shouldNotify(notice: SocialNotice): Promise<boolean> {
    if (notice.recipientId === notice.actorId) return false
    const hidden = await this.blocks.hiddenUserIds(notice.actorId)
    if (hidden.has(notice.recipientId)) return false
    if (notice.kind === 'DM_REQUEST') return this.isFirstDmRequest(notice)
    if (notice.kind !== 'LIKE' && notice.kind !== 'FOLLOW') return true
    // 같은 사람이 1시간 안에 좋아요(같은 게시물)·팔로우를 취소→다시 하면 행·푸시를 다시 만들지 않는다
    const recent = await this.prisma.notification.findFirst({
      where: {
        userId: notice.recipientId,
        actorId: notice.actorId,
        kind: notice.kind,
        refId: notice.refId ?? undefined,
        createdAt: { gte: new Date(this.clock().getTime() - LIKE_PUSH_WINDOW_MS) },
      },
      select: { id: true },
    })
    return recent === null
  }

  // DM 요청은 (받는 사람, 보낸 사람)당 1개. 받는 사람이 수락·거절하면 ConversationsService가 지운다
  private async isFirstDmRequest(notice: SocialNotice): Promise<boolean> {
    const existing = await this.prisma.notification.findFirst({
      where: { userId: notice.recipientId, actorId: notice.actorId, kind: 'DM_REQUEST' },
      select: { id: true },
    })
    return existing === null
  }
}
