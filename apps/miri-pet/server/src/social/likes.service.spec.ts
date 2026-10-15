import { NotFoundException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { BlockService } from '../moderation/block.service'
import { InAppNotificationService } from '../notifications/in-app-notification.service'
import { PostsRepository } from '../posts/posts.repository'
import { PrismaService } from '../prisma/prisma.service'
import { LikesService } from './likes.service'

const ME = '0199e3a0-0000-7000-8000-00000000000a'
const AUTHOR = '0199e3a0-0000-7000-8000-00000000000b'
const POST = '0199e3a0-0000-7000-8000-0000000000f1'

describe('LikesService', () => {
  let service: LikesService
  // 인터랙티브 트랜잭션은 같은 대역을 tx로 넘긴다
  const tx = {
    like: { createMany: jest.fn(), deleteMany: jest.fn() },
    post: { update: jest.fn(), findUniqueOrThrow: jest.fn() },
  }
  const prisma = { ...tx, $transaction: jest.fn((run: (client: typeof tx) => Promise<unknown>) => run(tx)) }
  const posts = { findVisibleAuthor: jest.fn() }
  const blocks = { hiddenUserIds: jest.fn() }
  const notifications = { notify: jest.fn() }

  beforeEach(async () => {
    posts.findVisibleAuthor.mockReset().mockResolvedValue({ id: POST, authorId: AUTHOR })
    blocks.hiddenUserIds.mockReset().mockResolvedValue(new Set())
    notifications.notify.mockReset().mockResolvedValue(undefined)
    Object.values(tx).forEach((delegate) => Object.values(delegate).forEach((fn) => fn.mockReset()))
    tx.post.update.mockResolvedValue({ likeCount: 1 })
    tx.post.findUniqueOrThrow.mockResolvedValue({ likeCount: 1 })
    const moduleRef = await Test.createTestingModule({
      providers: [
        LikesService,
        { provide: PrismaService, useValue: prisma },
        { provide: PostsRepository, useValue: posts },
        { provide: BlockService, useValue: blocks },
        { provide: InAppNotificationService, useValue: notifications },
      ],
    }).compile()
    service = moduleRef.get(LikesService)
  })

  it('보이지 않는 게시물 → 404', async () => {
    posts.findVisibleAuthor.mockResolvedValue(null)
    await expect(service.like(ME, POST)).rejects.toBeInstanceOf(NotFoundException)
    await expect(service.unlike(ME, POST)).rejects.toBeInstanceOf(NotFoundException)
  })

  it('새 좋아요만 카운터 증가 + LIKE 알림, 중복이면 알림 없음', async () => {
    tx.like.createMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 })
    await expect(service.like(ME, POST)).resolves.toEqual({ isLiked: true, likeCount: 1 })
    await expect(service.like(ME, POST)).resolves.toEqual({ isLiked: true, likeCount: 1 })
    expect(tx.post.update).toHaveBeenCalledTimes(1)
    expect(notifications.notify).toHaveBeenCalledTimes(1)
    expect(notifications.notify).toHaveBeenCalledWith({
      kind: 'LIKE',
      recipientId: AUTHOR,
      actorId: ME,
      refId: POST,
      postId: POST,
    })
  })

  it('취소는 행이 지워졌을 때만 카운터 감소', async () => {
    tx.like.deleteMany.mockResolvedValueOnce({ count: 0 })
    tx.post.findUniqueOrThrow.mockResolvedValue({ likeCount: 0 })
    await expect(service.unlike(ME, POST)).resolves.toEqual({ isLiked: false, likeCount: 0 })
    expect(tx.post.update).not.toHaveBeenCalled()
  })
})
