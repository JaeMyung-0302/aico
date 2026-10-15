import { Test } from '@nestjs/testing'
import { BlockService } from '../moderation/block.service'
import { PrismaService } from '../prisma/prisma.service'
import { createFakePrisma, type FakePrisma } from '../../test/helpers/fake-prisma'
import { InAppNotificationService } from './in-app-notification.service'
import { PushService } from './push.service'
import { COMMENT_PUSH_WINDOW_MS, LIKE_PUSH_WINDOW_MS, SocialPushService } from './social-push.service'

const AUTHOR = '0199e3a0-0000-7000-8000-00000000000a'
const ACTOR = '0199e3a0-0000-7000-8000-00000000000b'
const POST_A = '0199e3a0-0000-7000-8000-0000000000f1'
const POST_B = '0199e3a0-0000-7000-8000-0000000000f2'

type NotificationRow = {
  id: string
  userId: string
  actorId: string
  kind: string
  refId: string | null
  createdAt: Date
}
type CommentRow = { id: string; postId: string; authorId: string; createdAt: Date }

type NotificationWhere = {
  userId?: string
  actorId?: string
  kind?: string
  refId?: string
  createdAt?: { gte: Date }
  id?: { not: string }
}
type CommentWhere = { postId?: string; authorId?: string; createdAt?: { gte: Date }; id?: { not: string } }

// Notification·Comment 테이블 대역(메모리)
const useStores = (prisma: FakePrisma, clock: () => Date) => {
  let notifications: readonly NotificationRow[] = []
  let comments: readonly CommentRow[] = []
  const matchesNotification = (row: NotificationRow, where: NotificationWhere) =>
    (where.userId === undefined || row.userId === where.userId) &&
    (where.actorId === undefined || row.actorId === where.actorId) &&
    (where.kind === undefined || row.kind === where.kind) &&
    (where.refId === undefined || row.refId === where.refId) &&
    (where.createdAt === undefined || row.createdAt >= where.createdAt.gte) &&
    (where.id === undefined || row.id !== where.id.not)
  const matchesComment = (row: CommentRow, where: CommentWhere) =>
    (where.postId === undefined || row.postId === where.postId) &&
    (where.authorId === undefined || row.authorId === where.authorId) &&
    (where.createdAt === undefined || row.createdAt >= where.createdAt.gte) &&
    (where.id === undefined || row.id !== where.id.not)
  prisma.notification.create.mockImplementation(
    async ({ data }: { data: Omit<NotificationRow, 'id' | 'createdAt'> }) => {
      const row = { ...data, id: `n${notifications.length + 1}`, createdAt: clock() }
      notifications = [...notifications, row]
      return row
    },
  )
  prisma.notification.count.mockImplementation(
    async ({ where }: { where: NotificationWhere }) =>
      notifications.filter((row) => matchesNotification(row, where)).length,
  )
  prisma.notification.findFirst.mockImplementation(
    async ({ where }: { where: NotificationWhere }) =>
      notifications.find((row) => matchesNotification(row, where)) ?? null,
  )
  prisma.comment.count.mockImplementation(
    async ({ where }: { where: CommentWhere }) => comments.filter((row) => matchesComment(row, where)).length,
  )
  return {
    notificationCount: () => notifications.length,
    addComment: (postId: string): string => {
      const id = `0199e3a0-0000-7000-8000-${String(comments.length + 1).padStart(12, '0')}`
      comments = [...comments, { id, postId, authorId: ACTOR, createdAt: clock() }]
      return id
    },
  }
}

describe('소셜 알림 중복 억제(보안 리뷰 Phase 4 MEDIUM)', () => {
  let prisma: FakePrisma
  let service: InAppNotificationService
  let now: Date
  const push = { sendToUsers: jest.fn() }
  const blocks = { hiddenUserIds: jest.fn() }

  beforeEach(async () => {
    prisma = createFakePrisma()
    now = new Date('2026-10-15T03:00:00Z')
    push.sendToUsers.mockReset().mockResolvedValue({ sent: 1 })
    blocks.hiddenUserIds.mockReset().mockResolvedValue(new Set())
    prisma.user.findFirst.mockResolvedValue({ notifySocial: true })
    prisma.user.findUnique.mockResolvedValue({ nickname: '보리맘' })
    const moduleRef = await Test.createTestingModule({
      providers: [
        InAppNotificationService,
        SocialPushService,
        { provide: PrismaService, useValue: prisma },
        { provide: PushService, useValue: push },
        { provide: BlockService, useValue: blocks },
      ],
    }).compile()
    service = moduleRef.get(InAppNotificationService)
    service.clock = () => now
    moduleRef.get(SocialPushService).clock = () => now
  })

  const advance = (ms: number) => {
    now = new Date(now.getTime() + ms)
  }
  const follow = () => service.notify({ kind: 'FOLLOW', recipientId: AUTHOR, actorId: ACTOR, refId: null })

  it('팔로우→언팔로우→팔로우 반복(창 안) → 알림 행 1개, 푸시 1회', async () => {
    const stores = useStores(prisma, () => now)
    await follow()
    advance(60_000)
    await follow()
    advance(60_000)
    await follow()
    expect(stores.notificationCount()).toBe(1)
    expect(push.sendToUsers).toHaveBeenCalledTimes(1)
  })

  it('창이 지나면 같은 사람의 팔로우 알림을 다시 만든다', async () => {
    const stores = useStores(prisma, () => now)
    await follow()
    advance(LIKE_PUSH_WINDOW_MS + 1)
    await follow()
    expect(stores.notificationCount()).toBe(2)
    expect(push.sendToUsers).toHaveBeenCalledTimes(2)
  })

  it('같은 사람이 같은 게시물에 5분 안에 댓글 3개 → 인앱 행 3개, 푸시 1회', async () => {
    const stores = useStores(prisma, () => now)
    for (const preview of ['하나', '둘', '셋']) {
      const refId = stores.addComment(POST_A)
      await service.notify({ kind: 'COMMENT', recipientId: AUTHOR, actorId: ACTOR, refId, postId: POST_A, preview })
      advance(60_000)
    }
    expect(stores.notificationCount()).toBe(3)
    expect(push.sendToUsers).toHaveBeenCalledTimes(1)
  })

  it('5분이 지나거나 다른 게시물이면 댓글 푸시를 다시 보낸다', async () => {
    const stores = useStores(prisma, () => now)
    const comment = async (postId: string) => {
      const refId = stores.addComment(postId)
      await service.notify({ kind: 'COMMENT', recipientId: AUTHOR, actorId: ACTOR, refId, postId, preview: '안녕' })
    }
    await comment(POST_A)
    await comment(POST_B)
    advance(COMMENT_PUSH_WINDOW_MS + 1)
    await comment(POST_A)
    expect(stores.notificationCount()).toBe(3)
    expect(push.sendToUsers).toHaveBeenCalledTimes(3)
  })
})
