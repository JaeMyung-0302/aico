import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
  DM_REQUEST_DAILY_LIMIT,
  DM_REQUEST_LIMIT_CODE,
  DM_SOCKET_EVENTS,
  type Message,
  type MessageListQuery,
  type MessagePage,
  type MessageReadEvent,
  type SendMessageRequest,
} from '@miri-pet/shared'
import { isUniqueViolation, uniqueViolationTargets } from '../common/prisma/prisma-errors'
import { DELETED_USER_NICKNAME } from '../common/user-summary'
import { visibleUserWhereFor } from '../common/visible-user'
import { MEDIA_NOT_USABLE, MediaService } from '../media/media.service'
import { InAppNotificationService } from '../notifications/in-app-notification.service'
import { PushService } from '../notifications/push.service'
import { cursorAfter, cursorBefore, toPage } from '../posts/feed-cursor'
import { PrismaService } from '../prisma/prisma.service'
import { cannotMessage, ConversationsService, type Membership } from './conversations.service'
import { DmGateway } from './dm.gateway'
import { DM_PUSH_BODY } from './dm-rules'
import { MESSAGE_SELECT, toMessageDto } from './dm-mapper'

const mediaNotUsable = () =>
  new UnprocessableEntityException({ code: MEDIA_NOT_USABLE, message: '사용할 수 없는 이미지예요' })

const DAY_MS = 24 * 60 * 60 * 1000

const requestLimitReached = () =>
  new HttpException(
    { code: DM_REQUEST_LIMIT_CODE, message: '오늘은 새 메시지 요청을 더 보낼 수 없어요. 내일 다시 시도해 주세요' },
    HttpStatus.TOO_MANY_REQUESTS,
  )

// 사진 유니크(Message_mediaId_key) 위반 = 같은 사진을 동시에 다른 메시지에 붙인 경쟁
const isMediaUniqueViolation = (error: unknown): boolean =>
  uniqueViolationTargets(error).some((field) => field.includes('mediaId'))

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name)
  private readonly baseUrl: string

  constructor(
    private readonly prisma: PrismaService,
    private readonly conversations: ConversationsService,
    private readonly media: MediaService,
    private readonly gateway: DmGateway,
    private readonly push: PushService,
    private readonly notifications: InAppNotificationService,
    config: ConfigService,
  ) {
    this.baseUrl = config.get<string>('r2.publicBaseUrl') ?? ''
  }

  // 멤버십 → (senderId, clientMessageId) 멱등 → 차단·상대 상태 → 사진 검증 → 저장 → 소켓/푸시/요청 알림
  async send(senderId: string, conversationId: string, body: SendMessageRequest): Promise<Message> {
    const membership = await this.conversations.requireMember(senderId, conversationId)
    const replay = await this.findSent(senderId, body.clientMessageId)
    if (replay) {
      if (replay.conversationId !== conversationId) throw new ConflictException('이미 다른 대화에 쓴 메시지 id예요')
      return replay
    }
    await this.assertCanSend(senderId, membership)
    await this.assertRequestQuota(senderId, membership)
    if (body.mediaId) await this.assertAttachable(senderId, body.mediaId)

    const created = await this.store(senderId, membership, body)
    if (!created.isNew) return created.message
    await this.deliver(senderId, membership, created.message)
    return created.message
  }

  // 최신순(cursor) 또는 after 이후 오래된순(재연결 복구). 숨김(신고) 메시지는 빠진다
  async list(userId: string, conversationId: string, { cursor, after, limit }: MessageListQuery): Promise<MessagePage> {
    const { peerId } = await this.conversations.requireMember(userId, conversationId)
    await this.conversations.assertNotBlocked(userId, peerId)
    const rows = await this.prisma.message.findMany({
      where: { conversationId, hiddenAt: null, ...(after ? cursorAfter(after) : cursorBefore(cursor)) },
      orderBy: { id: after ? 'asc' : 'desc' },
      take: limit + 1,
      select: MESSAGE_SELECT,
    })
    const page = toPage(rows, limit)
    return { items: page.items.map((row) => toMessageDto(row, this.baseUrl)), nextCursor: page.nextCursor }
  }

  // 읽음: 앞으로만 움직인다. 수락한 멤버의 읽음만 상대에게 message:read로 알린다
  async markRead(userId: string, conversationId: string, lastReadMessageId: string): Promise<void> {
    const { peerId, myState } = await this.conversations.requireMember(userId, conversationId)
    await this.conversations.assertNotBlocked(userId, peerId)
    const message = await this.prisma.message.findFirst({
      where: { id: lastReadMessageId, conversationId },
      select: { id: true },
    })
    if (!message) throw new NotFoundException('메시지를 찾을 수 없어요')
    const { count } = await this.prisma.conversationMember.updateMany({
      where: {
        conversationId,
        userId,
        OR: [{ lastReadMessageId: null }, { lastReadMessageId: { lt: lastReadMessageId } }],
      },
      data: { lastReadMessageId },
    })
    if (count === 0 || myState !== 'ACCEPTED') return
    const event: MessageReadEvent = { conversationId, userId, lastReadMessageId }
    this.gateway.emitToUser(peerId, DM_SOCKET_EVENTS.messageRead, event)
  }

  private async findSent(senderId: string, clientMessageId: string): Promise<Message | null> {
    const row = await this.prisma.message.findUnique({
      where: { senderId_clientMessageId: { senderId, clientMessageId } },
      select: MESSAGE_SELECT,
    })
    return row ? toMessageDto(row, this.baseUrl) : null
  }

  // 차단(양방향)·탈퇴·정지·숨김 상대에게는 보낼 수 없다
  private async assertCanSend(senderId: string, { peerId, peer }: Membership): Promise<void> {
    await this.conversations.assertNotBlocked(senderId, peerId)
    if (!peer) throw cannotMessage()
    const visible = await this.prisma.user.findFirst({
      where: { id: peerId, ...visibleUserWhereFor(senderId) },
      select: { id: true },
    })
    if (!visible) throw cannotMessage()
  }

  // 보안 리뷰 MEDIUM-1: 새 메시지 요청(맞팔 아닌 상대 = REQUEST, 대화의 첫 메시지)은 24시간에 DM_REQUEST_DAILY_LIMIT건까지.
  // 집계 = 내가 멤버이고 상대가 아직 REQUEST이며 첫 메시지가 24시간 안인 대화(상대가 수락·답장하면 빠진다)
  private async assertRequestQuota(senderId: string, { conversationId, peer }: Membership): Promise<void> {
    if (peer?.state !== 'REQUEST') return
    const started = await this.prisma.message.findFirst({ where: { conversationId }, select: { id: true } })
    if (started) return
    const since = new Date(Date.now() - DAY_MS)
    const [row] = await this.prisma.$queryRaw<Array<{ count: number }>>`
      SELECT count(*)::int AS count
      FROM "ConversationMember" me
      JOIN "ConversationMember" peer
        ON peer."conversationId" = me."conversationId" AND peer."userId" <> me."userId" AND peer.state = 'REQUEST'
      WHERE me."userId" = ${senderId}::uuid
        AND (SELECT m."createdAt" FROM "Message" m WHERE m."conversationId" = me."conversationId" ORDER BY m.id LIMIT 1) >= ${since}`
    if ((row?.count ?? 0) >= DM_REQUEST_DAILY_LIMIT) throw requestLimitReached()
  }

  // 내 것 + READY + DM 용도 + 아직 다른 메시지에 안 붙음
  private async assertAttachable(senderId: string, mediaId: string): Promise<void> {
    await this.media.assertUsable(senderId, [mediaId], 'DM')
    if ((await this.prisma.message.count({ where: { mediaId } })) > 0) throw mediaNotUsable()
  }

  private async store(
    senderId: string,
    { conversationId, peerId, myState }: Membership,
    { clientMessageId, body, mediaId }: SendMessageRequest,
  ): Promise<{ message: Message; isNew: boolean }> {
    try {
      const row = await this.prisma.$transaction(async (tx) => {
        const message = await tx.message.create({
          data: { conversationId, senderId, clientMessageId, body: body ?? null, mediaId: mediaId ?? null },
          select: MESSAGE_SELECT,
        })
        await tx.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: message.createdAt } })
        // 보낸 사람: 내 메시지까지 읽음, 요청함에서 답장하면 수락, 숨겼던 대화는 다시 보이기
        await tx.conversationMember.update({
          where: { conversationId_userId: { conversationId, userId: senderId } },
          data: { lastReadMessageId: message.id, state: 'ACCEPTED', hiddenAt: null },
        })
        // QA1 P2: 답장 자동 수락도 수락(accept)처럼 받은 요청 알림을 지운다
        if (myState === 'REQUEST') await this.conversations.clearDmRequestNotices(senderId, peerId, tx)
        // 받는 사람: 수락한 대화를 숨겼으면 다시 보이게. 거절한(숨긴) 요청은 계속 숨김
        await tx.conversationMember.updateMany({
          where: { conversationId, userId: { not: senderId }, state: 'ACCEPTED', hiddenAt: { not: null } },
          data: { hiddenAt: null },
        })
        return message
      })
      return { message: toMessageDto(row, this.baseUrl), isNew: true }
    } catch (error) {
      // 같은 사진 동시 전송(LOW-4): DB 유니크가 1개만 남긴다
      if (isMediaUniqueViolation(error)) throw mediaNotUsable()
      // 같은 clientMessageId 동시 재전송: 먼저 저장된 행을 돌려준다
      if (!isUniqueViolation(error)) throw error
      const existing = await this.findSent(senderId, clientMessageId)
      if (!existing) throw error
      return { message: existing, isNew: false }
    }
  }

  // 저장은 이미 커밋됨 → 실시간·푸시·알림 실패는 로그만 남긴다(수신자는 재연결/재조회로 받는다)
  private async deliver(senderId: string, { conversationId, peerId, peer }: Membership, message: Message) {
    if (!peer) return
    const isDeclined = peer.state === 'REQUEST' && peer.hiddenAt !== null
    if (isDeclined) return
    try {
      this.gateway.emitToUser(peerId, DM_SOCKET_EVENTS.messageNew, message)
      if (peer.state === 'REQUEST') {
        await this.notifyRequest(senderId, peerId, conversationId)
        return
      }
      if (await this.gateway.isOnline(peerId)) return
      await this.pushMessage(senderId, peerId, message)
    } catch (error) {
      this.logger.warn(
        `[dm] deliver ${message.id} → ${peerId} failed: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  // 비맞팔 요청 → 인앱 DM_REQUEST 알림(수락 전에는 푸시 없음). (받는 사람, 보낸 사람)당 1개는 InAppNotificationService가 보장
  private async notifyRequest(senderId: string, recipientId: string, conversationId: string): Promise<void> {
    await this.notifications.notify({ kind: 'DM_REQUEST', recipientId, actorId: senderId, refId: conversationId })
  }

  private async pushMessage(senderId: string, recipientId: string, message: Message): Promise<void> {
    const recipient = await this.prisma.user.findFirst({
      where: { id: recipientId, status: 'ACTIVE' },
      select: { notifyDm: true },
    })
    if (!recipient?.notifyDm) return
    const sender = await this.prisma.user.findUnique({ where: { id: senderId }, select: { nickname: true } })
    await this.push.sendToUsers([
      {
        userId: recipientId,
        title: sender?.nickname ?? DELETED_USER_NICKNAME,
        body: DM_PUSH_BODY,
        data: { kind: 'DM', conversationId: message.conversationId },
      },
    ])
  }
}
