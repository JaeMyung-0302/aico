import { Test } from '@nestjs/testing'
import { VISIBLE_USER_WHERE } from '../common/visible-user'
import { BlockService } from '../moderation/block.service'
import { PrismaService } from '../prisma/prisma.service'
import { FeedService } from './feed.service'
import { PostsRepository } from './posts.repository'

const ME = '0199e3a0-0000-7000-8000-00000000000a'
const BLOCKED = '0199e3a0-0000-7000-8000-00000000000b'
const CURSOR = '0199e3a0-0000-7000-8000-0000000000c1'

describe('FeedService', () => {
  let service: FeedService
  const prisma = { follow: { findMany: jest.fn() } }
  const repository = { findPage: jest.fn() }
  const blocks = { hiddenUserIds: jest.fn() }

  beforeEach(async () => {
    prisma.follow.findMany.mockReset().mockResolvedValue([])
    repository.findPage.mockReset().mockResolvedValue({ items: [], nextCursor: null, hasMore: false })
    blocks.hiddenUserIds.mockReset().mockResolvedValue(new Set([BLOCKED]))
    const moduleRef = await Test.createTestingModule({
      providers: [
        FeedService,
        { provide: PrismaService, useValue: prisma },
        { provide: PostsRepository, useValue: repository },
        { provide: BlockService, useValue: blocks },
      ],
    }).compile()
    service = moduleRef.get(FeedService)
  })

  const followedBy = { followers: { some: { followerId: ME } } }

  it('home: 팔로잉 id 목록을 읽지 않고 (본인 ∪ 활성 팔로잉) 관계 필터 한 번으로 조회한다', async () => {
    await service.home(ME, { cursor: CURSOR, limit: 20, excludeFollowing: false })
    expect(prisma.follow.findMany).not.toHaveBeenCalled()
    expect(repository.findPage).toHaveBeenCalledWith(
      ME,
      {
        authorId: { notIn: [BLOCKED] },
        OR: [{ authorId: ME }, { author: { ...VISIBLE_USER_WHERE, ...followedBy } }],
        hiddenAt: null,
        deletedAt: null,
        id: { lt: CURSOR },
      },
      20,
    )
  })

  it('home: 다음 페이지가 없으면 fallback explore', async () => {
    expect(await service.home(ME, { limit: 20, excludeFollowing: false })).toEqual({
      items: [],
      nextCursor: null,
      fallback: 'explore',
    })
  })

  it('explore(excludeFollowing): 본인·팔로잉 작성자를 관계 필터로 뺀다', async () => {
    await service.explore(ME, { limit: 20, excludeFollowing: true })
    expect(prisma.follow.findMany).not.toHaveBeenCalled()
    expect(repository.findPage).toHaveBeenCalledWith(
      ME,
      {
        authorId: { notIn: [BLOCKED, ME] },
        author: { ...VISIBLE_USER_WHERE, followers: { none: { followerId: ME } } },
        hiddenAt: null,
        deletedAt: null,
      },
      20,
    )
  })

  it('explore: excludeFollowing이 없으면 차단 관계만 뺀다', async () => {
    await service.explore(ME, { limit: 20, excludeFollowing: false })
    expect(repository.findPage).toHaveBeenCalledWith(
      ME,
      { authorId: { notIn: [BLOCKED] }, author: VISIBLE_USER_WHERE, hiddenAt: null, deletedAt: null },
      20,
    )
  })
})
