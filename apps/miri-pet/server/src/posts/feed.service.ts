import { Injectable } from '@nestjs/common'
import type { FeedPage, FeedQuery } from '@miri-pet/shared'
import { VISIBLE_USER_WHERE } from '../common/visible-user'
import { BlockService } from '../moderation/block.service'
import { cursorBefore } from './feed-cursor'
import { PostsRepository } from './posts.repository'

// D10: 홈 = (팔로잉 ∪ 본인) 최신순 → 소진되면 fallback:'explore' → 클라가 탐색(전체 최신순)을 이어 붙인다
// 팔로잉은 id 목록을 읽어 IN (...)으로 넘기지 않고 관계 필터(서브쿼리)로 건다 → 팔로잉 수와 무관한 쿼리 크기
@Injectable()
export class FeedService {
  constructor(
    private readonly repository: PostsRepository,
    private readonly blocks: BlockService,
  ) {}

  async home(viewerId: string, { cursor, limit }: FeedQuery): Promise<FeedPage> {
    const hidden = await this.blocks.hiddenUserIds(viewerId)
    const page = await this.repository.findPage(
      viewerId,
      {
        authorId: { notIn: [...hidden] },
        OR: [{ authorId: viewerId }, { author: { ...VISIBLE_USER_WHERE, followers: { some: { followerId: viewerId } } } }],
        hiddenAt: null,
        deletedAt: null,
        ...cursorBefore(cursor),
      },
      limit,
    )
    if (page.hasMore) return { items: page.items, nextCursor: page.nextCursor }
    return { items: page.items, nextCursor: null, fallback: 'explore' }
  }

  // excludeFollowing: 홈에서 이미 본 (팔로잉 ∪ 본인) 게시물을 빼고 이어 붙인다
  async explore(viewerId: string, { cursor, limit, excludeFollowing }: FeedQuery): Promise<FeedPage> {
    const hidden = await this.blocks.hiddenUserIds(viewerId)
    const page = await this.repository.findPage(
      viewerId,
      {
        authorId: { notIn: excludeFollowing ? [...hidden, viewerId] : [...hidden] },
        author: excludeFollowing
          ? { ...VISIBLE_USER_WHERE, followers: { none: { followerId: viewerId } } }
          : VISIBLE_USER_WHERE,
        hiddenAt: null,
        deletedAt: null,
        ...cursorBefore(cursor),
      },
      limit,
    )
    return { items: page.items, nextCursor: page.nextCursor }
  }
}
