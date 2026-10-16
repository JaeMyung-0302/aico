import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common'
import {
  type CreatePostRequest,
  createPostRequestSchema,
  type CursorQuery,
  cursorQuerySchema,
  type FeedPage,
  type FeedQuery,
  feedQuerySchema,
  idSchema,
  type Post as PostDto,
  type PostPage,
} from '@miri-pet/shared'
import { Authenticated } from '../auth/decorators/authenticated.decorator'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import type { AuthUser } from '../auth/guards/jwt-auth.guard'
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe'
import { UserThrottle } from '../common/throttle/user-throttle.guard'
import { FeedService } from './feed.service'
import { PostsService } from './posts.service'

const idPipe = new ZodValidationPipe(idSchema)

// 사용자 단위 게시 제한(스팸·자동화 방지)
export const POST_CREATE_THROTTLE = { ttl: 60_000, limit: 10 }

@Controller()
@Authenticated()
export class PostsController {
  constructor(
    private readonly posts: PostsService,
    private readonly feed: FeedService,
  ) {}

  @Post('posts')
  @UserThrottle({ name: 'post-create', ...POST_CREATE_THROTTLE })
  create(
    @CurrentUser() me: AuthUser,
    @Body(new ZodValidationPipe(createPostRequestSchema)) body: CreatePostRequest,
  ): Promise<PostDto> {
    return this.posts.create(me.id, body)
  }

  @Get('posts/:id')
  get(@CurrentUser() me: AuthUser, @Param('id', idPipe) id: string): Promise<PostDto> {
    return this.posts.get(me.id, id)
  }

  @Delete('posts/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() me: AuthUser, @Param('id', idPipe) id: string): Promise<void> {
    return this.posts.remove(me.id, id)
  }

  @Get('users/:id/posts')
  listByUser(
    @CurrentUser() me: AuthUser,
    @Param('id', idPipe) id: string,
    @Query(new ZodValidationPipe(cursorQuerySchema)) query: CursorQuery,
  ): Promise<PostPage> {
    return this.posts.listByUser(me.id, id, query)
  }

  @Get('places/:placeId/posts')
  listByPlace(
    @CurrentUser() me: AuthUser,
    @Param('placeId', idPipe) placeId: string,
    @Query(new ZodValidationPipe(cursorQuerySchema)) query: CursorQuery,
  ): Promise<PostPage> {
    return this.posts.listByPlace(me.id, placeId, query)
  }

  @Get('feed/home')
  home(
    @CurrentUser() me: AuthUser,
    @Query(new ZodValidationPipe(feedQuerySchema)) query: FeedQuery,
  ): Promise<FeedPage> {
    return this.feed.home(me.id, query)
  }

  @Get('feed/explore')
  explore(
    @CurrentUser() me: AuthUser,
    @Query(new ZodValidationPipe(feedQuerySchema)) query: FeedQuery,
  ): Promise<FeedPage> {
    return this.feed.explore(me.id, query)
  }
}
