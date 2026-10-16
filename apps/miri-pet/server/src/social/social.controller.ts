import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, Query } from '@nestjs/common'
import {
  type Comment,
  type CommentPage,
  type CreateCommentRequest,
  createCommentRequestSchema,
  type CursorQuery,
  cursorQuerySchema,
  type FollowResult,
  idSchema,
  type LikeResult,
  type UserPage,
  type UserSearchQuery,
  userSearchQuerySchema,
  type UserSummary,
} from '@miri-pet/shared'
import { Authenticated } from '../auth/decorators/authenticated.decorator'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import type { AuthUser } from '../auth/guards/jwt-auth.guard'
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe'
import { UserThrottle } from '../common/throttle/user-throttle.guard'
import { CommentsService } from './comments.service'
import { FollowsService } from './follows.service'
import { LikesService } from './likes.service'

const idPipe = new ZodValidationPipe(idSchema)
const cursorPipe = new ZodValidationPipe(cursorQuerySchema)

// 사용자 단위 쓰기 제한(스팸 댓글·팔로우 반복으로 알림 폭탄 방지)
export const COMMENT_CREATE_THROTTLE = { ttl: 60_000, limit: 30 }
export const FOLLOW_THROTTLE = { ttl: 60_000, limit: 30 }

@Controller()
@Authenticated()
export class SocialController {
  constructor(
    private readonly likes: LikesService,
    private readonly comments: CommentsService,
    private readonly follows: FollowsService,
  ) {}

  @Put('posts/:id/like')
  like(@CurrentUser() me: AuthUser, @Param('id', idPipe) id: string): Promise<LikeResult> {
    return this.likes.like(me.id, id)
  }

  @Delete('posts/:id/like')
  unlike(@CurrentUser() me: AuthUser, @Param('id', idPipe) id: string): Promise<LikeResult> {
    return this.likes.unlike(me.id, id)
  }

  @Get('posts/:id/comments')
  listComments(
    @CurrentUser() me: AuthUser,
    @Param('id', idPipe) id: string,
    @Query(cursorPipe) query: CursorQuery,
  ): Promise<CommentPage> {
    return this.comments.list(me.id, id, query)
  }

  @Post('posts/:id/comments')
  @UserThrottle({ name: 'comment-create', ...COMMENT_CREATE_THROTTLE })
  createComment(
    @CurrentUser() me: AuthUser,
    @Param('id', idPipe) id: string,
    @Body(new ZodValidationPipe(createCommentRequestSchema)) body: CreateCommentRequest,
  ): Promise<Comment> {
    return this.comments.create(me.id, id, body)
  }

  @Delete('comments/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeComment(@CurrentUser() me: AuthUser, @Param('id', idPipe) id: string): Promise<void> {
    return this.comments.remove(me.id, id)
  }

  @Put('users/:id/follow')
  @UserThrottle({ name: 'follow', ...FOLLOW_THROTTLE })
  follow(@CurrentUser() me: AuthUser, @Param('id', idPipe) id: string): Promise<FollowResult> {
    return this.follows.follow(me.id, id)
  }

  @Delete('users/:id/follow')
  unfollow(@CurrentUser() me: AuthUser, @Param('id', idPipe) id: string): Promise<FollowResult> {
    return this.follows.unfollow(me.id, id)
  }

  @Get('users/:id/followers')
  followers(
    @CurrentUser() me: AuthUser,
    @Param('id', idPipe) id: string,
    @Query(cursorPipe) query: CursorQuery,
  ): Promise<UserPage> {
    return this.follows.list(me.id, id, 'followers', query)
  }

  @Get('users/:id/following')
  following(
    @CurrentUser() me: AuthUser,
    @Param('id', idPipe) id: string,
    @Query(cursorPipe) query: CursorQuery,
  ): Promise<UserPage> {
    return this.follows.list(me.id, id, 'following', query)
  }

  @Get('users')
  search(
    @CurrentUser() me: AuthUser,
    @Query(new ZodValidationPipe(userSearchQuerySchema)) query: UserSearchQuery,
  ): Promise<{ items: UserSummary[] }> {
    return this.follows.search(me.id, query)
  }
}
