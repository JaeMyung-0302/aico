import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { DELETED_USER_NICKNAME } from '../common/user-summary'
import { PushService } from './push.service'

// DM_REQUEST(Phase 5): 인앱 알림 행만 만든다(요청 수락 전에는 푸시 없음 — InAppNotificationService)
export type SocialKind = 'LIKE' | 'COMMENT' | 'FOLLOW' | 'DM_REQUEST'

export type SocialPushInput = {
  notificationId: string
  kind: SocialKind
  recipientId: string
  actorId: string
  // COMMENT: commentId (댓글 푸시 중복 판정에서 이번 댓글을 뺀다)
  refId?: string | null
  postId?: string
  preview?: string
}

// 같은 게시물 좋아요 푸시는 1시간에 1회 (인앱 알림 행은 매번 남긴다)
export const LIKE_PUSH_WINDOW_MS = 60 * 60 * 1000
// 같은 사람·같은 게시물 댓글 푸시는 5분에 1회 (인앱 알림 행은 매번 남긴다)
export const COMMENT_PUSH_WINDOW_MS = 5 * 60 * 1000
const PREVIEW_MAX = 40

const clip = (text: string): string => (text.length > PREVIEW_MAX ? `${text.slice(0, PREVIEW_MAX)}…` : text)

const bodyOf = (kind: SocialKind, nickname: string, preview?: string): string => {
  if (kind === 'LIKE') return `${nickname}님이 회원님의 게시물을 좋아해요`
  if (kind === 'COMMENT') return `${nickname}님이 댓글을 남겼어요: ${clip(preview ?? '')}`
  if (kind === 'DM_REQUEST') return `${nickname}님이 메시지 요청을 보냈어요`
  return `${nickname}님이 회원님을 팔로우해요`
}

const dataOf = (input: SocialPushInput): Record<string, string> =>
  input.kind === 'FOLLOW'
    ? { kind: input.kind, userId: input.actorId }
    : { kind: input.kind, postId: input.postId ?? '' }

@Injectable()
export class SocialPushService {
  clock: () => Date = () => new Date()

  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushService,
  ) {}

  // 푸시를 보냈으면 true. 수신자가 소셜 알림을 껐거나 활성 사용자가 아니면 보내지 않는다
  async send(input: SocialPushInput): Promise<boolean> {
    if (input.kind === 'LIKE' && (await this.likePushedRecently(input))) return false
    if (input.kind === 'COMMENT' && (await this.commentPushedRecently(input))) return false
    const recipient = await this.prisma.user.findFirst({
      where: { id: input.recipientId, status: 'ACTIVE' },
      select: { notifySocial: true },
    })
    if (!recipient?.notifySocial) return false
    const actor = await this.prisma.user.findUnique({ where: { id: input.actorId }, select: { nickname: true } })
    const nickname = actor?.nickname ?? DELETED_USER_NICKNAME
    await this.push.sendToUsers([
      {
        userId: input.recipientId,
        title: '미리펫',
        body: bodyOf(input.kind, nickname, input.preview),
        data: dataOf(input),
      },
    ])
    return true
  }

  // 이번 알림 말고 1시간 안에 같은 게시물 LIKE 알림이 있었으면 이미 푸시를 보낸 것으로 본다
  private async likePushedRecently(input: SocialPushInput): Promise<boolean> {
    const count = await this.prisma.notification.count({
      where: {
        userId: input.recipientId,
        kind: 'LIKE',
        refId: input.postId,
        createdAt: { gte: new Date(this.clock().getTime() - LIKE_PUSH_WINDOW_MS) },
        id: { not: input.notificationId },
      },
    })
    return count > 0
  }

  // 같은 사람이 같은 게시물에 5분 안에 남긴 다른 댓글이 있으면 그때 이미 푸시를 보낸 것으로 본다
  private async commentPushedRecently(input: SocialPushInput): Promise<boolean> {
    const count = await this.prisma.comment.count({
      where: {
        postId: input.postId,
        authorId: input.actorId,
        createdAt: { gte: new Date(this.clock().getTime() - COMMENT_PUSH_WINDOW_MS) },
        ...(input.refId ? { id: { not: input.refId } } : {}),
      },
    })
    return count > 0
  }
}
