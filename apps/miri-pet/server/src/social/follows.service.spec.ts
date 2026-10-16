import { BadRequestException, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Test } from '@nestjs/testing'
import { createFakePrisma, type FakePrisma } from '../../test/helpers/fake-prisma'
import { EventsService } from '../events/events.service'
import { BlockService } from '../moderation/block.service'
import { InAppNotificationService } from '../notifications/in-app-notification.service'
import { PrismaService } from '../prisma/prisma.service'
import { FollowsService } from './follows.service'

const ME = '0199e3a0-0000-7000-8000-00000000000a'
const OTHER = '0199e3a0-0000-7000-8000-00000000000b'
const HIDDEN = '0199e3a0-0000-7000-8000-00000000000c'

describe('FollowsService', () => {
  let prisma: FakePrisma
  let service: FollowsService
  const blocks = { hiddenUserIds: jest.fn(), isBlockedEitherWay: jest.fn() }
  const notifications = { notify: jest.fn() }
  const events = { capture: jest.fn() }

  beforeEach(async () => {
    prisma = createFakePrisma()
    blocks.hiddenUserIds.mockReset().mockResolvedValue(new Set([HIDDEN]))
    blocks.isBlockedEitherWay.mockReset().mockResolvedValue(false)
    notifications.notify.mockReset().mockResolvedValue(undefined)
    events.capture.mockReset()
    prisma.user.findFirst.mockResolvedValue({ id: OTHER })
    const moduleRef = await Test.createTestingModule({
      providers: [
        FollowsService,
        { provide: PrismaService, useValue: prisma },
        { provide: BlockService, useValue: blocks },
        { provide: InAppNotificationService, useValue: notifications },
        { provide: EventsService, useValue: events },
        { provide: ConfigService, useValue: new ConfigService({ r2: { publicBaseUrl: 'https://img.test' } }) },
      ],
    }).compile()
    service = moduleRef.get(FollowsService)
  })

  it('자기 자신 팔로우 → 400', async () => {
    await expect(service.follow(ME, ME)).rejects.toBeInstanceOf(BadRequestException)
  })

  it('차단 관계면 404, 행·알림 없음', async () => {
    blocks.isBlockedEitherWay.mockResolvedValue(true)
    await expect(service.follow(ME, OTHER)).rejects.toBeInstanceOf(NotFoundException)
    expect(prisma.follow.createMany).not.toHaveBeenCalled()
  })

  it('새 팔로우만 이벤트·FOLLOW 알림, 이미 팔로우 중이면 멱등(알림 없음)', async () => {
    prisma.follow.createMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 })
    await expect(service.follow(ME, OTHER)).resolves.toEqual({ isFollowing: true })
    await expect(service.follow(ME, OTHER)).resolves.toEqual({ isFollowing: true })
    expect(notifications.notify).toHaveBeenCalledTimes(1)
    expect(notifications.notify).toHaveBeenCalledWith({ kind: 'FOLLOW', recipientId: OTHER, actorId: ME, refId: null })
    expect(events.capture).toHaveBeenCalledTimes(1)
  })

  it('목록 커서가 차단 관계 사용자면 DB를 보지 않고 400', async () => {
    await expect(service.list(ME, ME, 'followers', { cursor: HIDDEN, limit: 20 })).rejects.toBeInstanceOf(
      BadRequestException,
    )
    expect(prisma.follow.findFirst).not.toHaveBeenCalled()
  })

  it('목록 커서 행을 찾을 때도 상대가 보이는 사용자여야 한다(없으면 400)', async () => {
    prisma.follow.findFirst.mockResolvedValue(null)
    await expect(service.list(ME, ME, 'following', { cursor: OTHER, limit: 20 })).rejects.toBeInstanceOf(
      BadRequestException,
    )
    expect(prisma.follow.findFirst).toHaveBeenCalledWith({
      where: { followerId: ME, followeeId: OTHER, followee: { status: 'ACTIVE', hiddenAt: null } },
      select: { createdAt: true },
    })
  })
})
