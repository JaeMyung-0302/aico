import { Test } from '@nestjs/testing'
import { BlockService } from '../moderation/block.service'
import { PrismaService } from '../prisma/prisma.service'
import { createFakePrisma, type FakePrisma } from '../../test/helpers/fake-prisma'
import { InAppNotificationService } from './in-app-notification.service'
import { PushService } from './push.service'
import { LIKE_PUSH_WINDOW_MS, SocialPushService } from './social-push.service'

const AUTHOR = '0199e3a0-0000-7000-8000-00000000000a'
const POST = '0199e3a0-0000-7000-8000-0000000000f1'
const actorIds = ['01', '02', '03'].map((n) => `0199e3a0-0000-7000-8000-0000000000${n}`)

type Row = { id: string; userId: string; actorId: string; kind: string; refId: string; createdAt: Date }

// Notification 테이블 대역: create/count/findFirst만 메모리로 흉내 낸다
const useNotificationStore = (prisma: FakePrisma, clock: () => Date) => {
  let rows: readonly Row[] = []
  type Where = {
    userId?: string
    actorId?: string
    kind?: string
    refId?: string
    createdAt?: { gte: Date }
    id?: { not: string }
  }
  const matches = (row: Row, where: Where) =>
    (where.userId === undefined || row.userId === where.userId) &&
    (where.actorId === undefined || row.actorId === where.actorId) &&
    (where.kind === undefined || row.kind === where.kind) &&
    (where.refId === undefined || row.refId === where.refId) &&
    (where.createdAt === undefined || row.createdAt >= where.createdAt.gte) &&
    (where.id === undefined || row.id !== where.id.not)
  prisma.notification.create.mockImplementation(async ({ data }: { data: Omit<Row, 'id' | 'createdAt'> }) => {
    const row = { ...data, id: `n${rows.length + 1}`, createdAt: clock() }
    rows = [...rows, row]
    return row
  })
  prisma.notification.count.mockImplementation(
    async ({ where }: { where: Where }) => rows.filter((row) => matches(row, where)).length,
  )
  prisma.notification.findFirst.mockImplementation(
    async ({ where }: { where: Where }) => rows.find((row) => matches(row, where)) ?? null,
  )
  return { count: () => rows.length }
}

describe('InAppNotificationService + SocialPushService', () => {
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

  const like = (actorId: string) =>
    service.notify({ kind: 'LIKE', recipientId: AUTHOR, actorId, refId: POST, postId: POST })

  it('같은 게시물 좋아요 3회/1시간 → 알림 행 3개, 푸시 1회', async () => {
    const store = useNotificationStore(prisma, () => now)
    for (const actorId of actorIds) {
      await like(actorId)
      now = new Date(now.getTime() + 10 * 60_000)
    }
    expect(store.count()).toBe(3)
    expect(push.sendToUsers).toHaveBeenCalledTimes(1)
    expect(push.sendToUsers).toHaveBeenCalledWith([
      expect.objectContaining({
        userId: AUTHOR,
        body: '보리맘님이 회원님의 게시물을 좋아해요',
        data: { kind: 'LIKE', postId: POST },
      }),
    ])
  })

  it('1시간이 지나면 같은 게시물 좋아요도 다시 푸시한다', async () => {
    useNotificationStore(prisma, () => now)
    await like(actorIds[0]!)
    now = new Date(now.getTime() + LIKE_PUSH_WINDOW_MS + 1)
    await like(actorIds[1]!)
    expect(push.sendToUsers).toHaveBeenCalledTimes(2)
  })

  it('같은 사람이 1시간 안에 좋아요를 취소했다 다시 누르면 알림 행도 다시 만들지 않는다', async () => {
    const store = useNotificationStore(prisma, () => now)
    await like(actorIds[0]!)
    await like(actorIds[0]!)
    expect(store.count()).toBe(1)
    expect(push.sendToUsers).toHaveBeenCalledTimes(1)
  })

  it('자기 자신에게는 알림을 만들지 않는다', async () => {
    const store = useNotificationStore(prisma, () => now)
    await service.notify({ kind: 'FOLLOW', recipientId: AUTHOR, actorId: AUTHOR, refId: null })
    expect(store.count()).toBe(0)
    expect(push.sendToUsers).not.toHaveBeenCalled()
  })

  it('차단 관계(어느 쪽이든)면 알림·푸시 모두 없다', async () => {
    const store = useNotificationStore(prisma, () => now)
    blocks.hiddenUserIds.mockResolvedValue(new Set([AUTHOR]))
    await like(actorIds[0]!)
    expect(store.count()).toBe(0)
    expect(push.sendToUsers).not.toHaveBeenCalled()
  })

  it('수신자가 소셜 알림을 끄면 인앱 행은 남기고 푸시는 보내지 않는다', async () => {
    const store = useNotificationStore(prisma, () => now)
    prisma.user.findFirst.mockResolvedValue({ notifySocial: false })
    await service.notify({ kind: 'FOLLOW', recipientId: AUTHOR, actorId: actorIds[0]!, refId: null })
    expect(store.count()).toBe(1)
    expect(push.sendToUsers).not.toHaveBeenCalled()
  })

  it('댓글·팔로우 푸시 문구와 이동 데이터', async () => {
    useNotificationStore(prisma, () => now)
    await service.notify({
      kind: 'COMMENT',
      recipientId: AUTHOR,
      actorId: actorIds[0]!,
      refId: actorIds[2]!,
      postId: POST,
      preview: '여기 대형견도 되나요?',
    })
    await service.notify({ kind: 'FOLLOW', recipientId: AUTHOR, actorId: actorIds[1]!, refId: null })
    expect(push.sendToUsers).toHaveBeenNthCalledWith(1, [
      expect.objectContaining({
        body: '보리맘님이 댓글을 남겼어요: 여기 대형견도 되나요?',
        data: { kind: 'COMMENT', postId: POST },
      }),
    ])
    expect(push.sendToUsers).toHaveBeenNthCalledWith(2, [
      expect.objectContaining({
        body: '보리맘님이 회원님을 팔로우해요',
        data: { kind: 'FOLLOW', userId: actorIds[1] },
      }),
    ])
  })

  it('알림 저장이 실패해도 예외를 던지지 않는다(좋아요 자체는 성공해야 한다)', async () => {
    prisma.notification.findFirst.mockResolvedValue(null)
    prisma.notification.create.mockRejectedValue(new Error('db down'))
    await expect(like(actorIds[0]!)).resolves.toBeUndefined()
    expect(push.sendToUsers).not.toHaveBeenCalled()
  })
})
