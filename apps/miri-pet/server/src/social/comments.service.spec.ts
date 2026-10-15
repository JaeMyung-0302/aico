import { NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Test } from '@nestjs/testing'
import { createFakePrisma, type FakePrisma } from '../../test/helpers/fake-prisma'
import { BlockService } from '../moderation/block.service'
import { InAppNotificationService } from '../notifications/in-app-notification.service'
import { PostsRepository } from '../posts/posts.repository'
import { PrismaService } from '../prisma/prisma.service'
import { CommentsService } from './comments.service'

const ME = '0199e3a0-0000-7000-8000-00000000000a'
const AUTHOR = '0199e3a0-0000-7000-8000-00000000000b'
const POST = '0199e3a0-0000-7000-8000-0000000000f1'
const COMMENT = '0199e3a0-0000-7000-8000-0000000000c1'

describe('CommentsService', () => {
  let prisma: FakePrisma
  let service: CommentsService
  const posts = { findVisibleAuthor: jest.fn() }
  const blocks = { hiddenUserIds: jest.fn() }
  const notifications = { notify: jest.fn() }

  beforeEach(async () => {
    prisma = createFakePrisma()
    posts.findVisibleAuthor.mockReset().mockResolvedValue({ id: POST, authorId: AUTHOR })
    blocks.hiddenUserIds.mockReset().mockResolvedValue(new Set())
    notifications.notify.mockReset().mockResolvedValue(undefined)
    const moduleRef = await Test.createTestingModule({
      providers: [
        CommentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: PostsRepository, useValue: posts },
        { provide: BlockService, useValue: blocks },
        { provide: InAppNotificationService, useValue: notifications },
        { provide: ConfigService, useValue: new ConfigService({ r2: { publicBaseUrl: 'https://img.test' } }) },
      ],
    }).compile()
    service = moduleRef.get(CommentsService)
  })

  it('보이지 않는 게시물에 댓글 → 404, 행 없음', async () => {
    posts.findVisibleAuthor.mockResolvedValue(null)
    await expect(service.create(ME, POST, { body: '안녕' })).rejects.toBeInstanceOf(NotFoundException)
    expect(prisma.comment.create).not.toHaveBeenCalled()
  })

  it('댓글 작성 → commentCount 증가 + COMMENT 알림(refId = 댓글 id)', async () => {
    const createdAt = new Date('2026-10-15T03:00:00Z')
    prisma.comment.create.mockResolvedValue({
      id: COMMENT,
      postId: POST,
      body: '안녕',
      createdAt,
      author: { id: ME, nickname: '보리맘', avatarMedia: null },
    })
    prisma.post.update.mockResolvedValue({})
    const result = await service.create(ME, POST, { body: '안녕' })
    expect(result).toEqual({
      id: COMMENT,
      postId: POST,
      body: '안녕',
      author: { id: ME, nickname: '보리맘', avatarUrl: null },
      createdAt: createdAt.toISOString(),
    })
    expect(prisma.post.update).toHaveBeenCalledWith({ where: { id: POST }, data: { commentCount: { increment: 1 } } })
    expect(notifications.notify).toHaveBeenCalledWith({
      kind: 'COMMENT',
      recipientId: AUTHOR,
      actorId: ME,
      refId: COMMENT,
      postId: POST,
      preview: '안녕',
    })
  })

  it('작성자·게시물 주인이 아니면 삭제 404', async () => {
    prisma.comment.findFirst.mockResolvedValue(null)
    await expect(service.remove(ME, COMMENT)).rejects.toBeInstanceOf(NotFoundException)
  })
})
