import { BadRequestException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { CreatePostRequest, CursorQuery, Post, PostPage } from '@miri-pet/shared'
import { uniqueViolationTargets } from '../common/prisma/prisma-errors'
import { userNotFound, VISIBLE_USER_WHERE } from '../common/visible-user'
import { EventsService } from '../events/events.service'
import { MEDIA_NOT_USABLE, MediaService } from '../media/media.service'
import { BlockService } from '../moderation/block.service'
import { PrismaService } from '../prisma/prisma.service'
import { cursorBefore } from './feed-cursor'
import { POST_SELECT, toPostDto } from './post-mapper'
import { PostsRepository, visiblePostWhere } from './posts.repository'

export const POST_NOT_FOUND_MESSAGE = '게시물을 찾을 수 없어요'
export const postNotFound = (): NotFoundException => new NotFoundException(POST_NOT_FOUND_MESSAGE)
export const PLACE_NOT_USABLE = 'PLACE_NOT_USABLE'

const mediaNotUsable = () =>
  new UnprocessableEntityException({ code: MEDIA_NOT_USABLE, message: '사용할 수 없는 이미지예요' })

@Injectable()
export class PostsService {
  private readonly baseUrl: string

  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: PostsRepository,
    private readonly blocks: BlockService,
    private readonly media: MediaService,
    private readonly events: EventsService,
    config: ConfigService,
  ) {
    this.baseUrl = config.get<string>('r2.publicBaseUrl') ?? ''
  }

  // 이미지: 내 것 + READY + POST 용도 + 아직 어떤 게시물에도 안 붙음 / 펫: 1마리 이상 모두 내 펫
  async create(authorId: string, body: CreatePostRequest): Promise<Post> {
    if (new Set(body.mediaIds).size !== body.mediaIds.length) {
      throw new BadRequestException('같은 이미지를 두 번 넣을 수 없어요')
    }
    const petIds = [...new Set(body.petIds)]
    await this.media.assertUsable(authorId, body.mediaIds, 'POST')
    const attached = await this.prisma.postImage.count({ where: { mediaId: { in: body.mediaIds } } })
    if (attached > 0) throw mediaNotUsable()
    const ownPets = await this.prisma.pet.count({ where: { id: { in: petIds }, ownerId: authorId } })
    if (ownPets !== petIds.length) {
      throw new UnprocessableEntityException({ code: 'PET_NOT_USABLE', message: '내 펫만 태그할 수 있어요' })
    }
    if (body.placeId && !(await this.isActivePlace(body.placeId))) {
      throw new UnprocessableEntityException({ code: PLACE_NOT_USABLE, message: '태그할 수 없는 장소예요' })
    }

    const row = await this.prisma.post.create({
      data: {
        authorId,
        caption: body.caption,
        placeId: body.placeId ?? null,
        images: { create: body.mediaIds.map((mediaId, order) => ({ mediaId, order })) },
        pets: { create: petIds.map((petId) => ({ petId })) },
      },
      select: POST_SELECT,
    }).catch((error: unknown) => {
      // 동시 게시로 같은 이미지가 다른 게시물에 먼저 붙었다(PostImage.mediaId 유니크)
      if (uniqueViolationTargets(error).includes('mediaId')) throw mediaNotUsable()
      throw error
    })
    this.events.capture(authorId, 'post_created', { imageCount: body.mediaIds.length, petCount: petIds.length })
    return toPostDto(row, false, this.baseUrl)
  }

  async get(viewerId: string, postId: string): Promise<Post> {
    const hidden = await this.blocks.hiddenUserIds(viewerId)
    const post = await this.repository.findOne(viewerId, postId, hidden)
    if (!post) throw postNotFound()
    return post
  }

  // 작성자 삭제: soft delete + 이미지(Media 행·R2)는 바로 파기
  async remove(authorId: string, postId: string): Promise<void> {
    const post = await this.prisma.post.findFirst({
      where: { id: postId, authorId, deletedAt: null },
      select: { images: { select: { media: { select: { id: true, bucket: true, key: true, status: true } } } } },
    })
    if (!post) throw postNotFound()
    const media = post.images.map((image) => image.media)
    await this.prisma.$transaction([
      this.prisma.post.update({ where: { id: postId }, data: { deletedAt: new Date() } }),
      this.prisma.media.deleteMany({ where: { id: { in: media.map((row) => row.id) } } }),
    ])
    await this.media.purgeMedia(media)
  }

  // 17 프로필 그리드: 프로필과 같은 조건(차단 양방향·비활성 → 404)
  async listByUser(viewerId: string, userId: string, query: CursorQuery): Promise<PostPage> {
    const isSelf = viewerId === userId
    if (!isSelf && (await this.blocks.isBlockedEitherWay(viewerId, userId))) throw userNotFound()
    const user = await this.prisma.user.findFirst({
      where: isSelf ? { id: userId, status: 'ACTIVE' } : { id: userId, ...VISIBLE_USER_WHERE },
      select: { id: true },
    })
    if (!user) throw userNotFound()
    const page = await this.repository.findPage(
      viewerId,
      { authorId: userId, hiddenAt: null, deletedAt: null, ...cursorBefore(query.cursor) },
      query.limit,
    )
    return { items: page.items, nextCursor: page.nextCursor }
  }

  // 10 여기서 찍은 게시물: 피드와 같은 가시성(차단 양방향·숨김·삭제·비활성 작성자 제외), 최신순
  async listByPlace(viewerId: string, placeId: string, query: CursorQuery): Promise<PostPage> {
    if (!(await this.isActivePlace(placeId))) throw new NotFoundException('장소를 찾을 수 없어요')
    const hidden = await this.blocks.hiddenUserIds(viewerId)
    const page = await this.repository.findPage(
      viewerId,
      { placeId, ...visiblePostWhere(viewerId, hidden), ...cursorBefore(query.cursor) },
      query.limit,
    )
    return { items: page.items, nextCursor: page.nextCursor }
  }

  private async isActivePlace(placeId: string): Promise<boolean> {
    return (await this.prisma.place.count({ where: { id: placeId, status: 'ACTIVE' } })) > 0
  }
}
