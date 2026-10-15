import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Post } from '@miri-pet/shared'
import { VISIBLE_USER_WHERE } from '../common/visible-user'
import type { Prisma } from '../generated/prisma'
import { PrismaService } from '../prisma/prisma.service'
import { type Page, toPage } from './feed-cursor'
import { POST_SELECT, toPostDto } from './post-mapper'

const ALIVE = { hiddenAt: null, deletedAt: null } as const

// 다른 사람이 볼 수 있는 게시물: 숨김·삭제 아님 + 차단 관계 작성자 아님 + 작성자 활성(본인 글은 예외)
export const visiblePostWhere = (viewerId: string, hiddenUserIds: ReadonlySet<string>): Prisma.PostWhereInput => ({
  ...ALIVE,
  AND: [{ authorId: { notIn: [...hiddenUserIds] } }, { OR: [{ authorId: viewerId }, { author: VISIBLE_USER_WHERE }] }],
})

// 게시물 조회 공통. 다른 사람 콘텐츠를 읽는 함수는 hiddenUserIds를 필수 인자로 받는다
@Injectable()
export class PostsRepository {
  private readonly baseUrl: string

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.baseUrl = config.get<string>('r2.publicBaseUrl') ?? ''
  }

  // id 내림차순 한 페이지 + 내 좋아요 여부(페이지 단위 IN 1회)
  async findPage(viewerId: string, where: Prisma.PostWhereInput, limit: number): Promise<Page<Post>> {
    const rows = await this.prisma.post.findMany({
      where,
      orderBy: { id: 'desc' },
      take: limit + 1,
      select: POST_SELECT,
    })
    const page = toPage(rows, limit)
    const liked = await this.likedPostIds(
      viewerId,
      page.items.map((row) => row.id),
    )
    return { ...page, items: page.items.map((row) => toPostDto(row, liked.has(row.id), this.baseUrl)) }
  }

  async findOne(viewerId: string, postId: string, hiddenUserIds: ReadonlySet<string>): Promise<Post | null> {
    const row = await this.prisma.post.findFirst({
      where: { id: postId, ...visiblePostWhere(viewerId, hiddenUserIds) },
      select: POST_SELECT,
    })
    if (!row) return null
    const liked = await this.likedPostIds(viewerId, [row.id])
    return toPostDto(row, liked.has(row.id), this.baseUrl)
  }

  // 좋아요·댓글 전에 대상 확인: 볼 수 있는 게시물이면 작성자 id
  async findVisibleAuthor(
    viewerId: string,
    postId: string,
    hiddenUserIds: ReadonlySet<string>,
  ): Promise<{ id: string; authorId: string } | null> {
    return this.prisma.post.findFirst({
      where: { id: postId, ...visiblePostWhere(viewerId, hiddenUserIds) },
      select: { id: true, authorId: true },
    })
  }

  private async likedPostIds(userId: string, postIds: readonly string[]): Promise<ReadonlySet<string>> {
    if (postIds.length === 0) return new Set()
    const likes = await this.prisma.like.findMany({
      where: { userId, postId: { in: [...postIds] } },
      select: { postId: true },
    })
    return new Set(likes.map((like) => like.postId))
  }
}
