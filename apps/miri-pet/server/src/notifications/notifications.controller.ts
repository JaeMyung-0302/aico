import { Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common'
import { type CursorQuery, cursorQuerySchema, type NotificationPage, type UnreadCount } from '@miri-pet/shared'
import { Authenticated } from '../auth/decorators/authenticated.decorator'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import type { AuthUser } from '../auth/guards/jwt-auth.guard'
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe'
import { NotificationsService } from './notifications.service'

@Controller('notifications')
@Authenticated()
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(
    @CurrentUser() me: AuthUser,
    @Query(new ZodValidationPipe(cursorQuerySchema)) query: CursorQuery,
  ): Promise<NotificationPage> {
    return this.notifications.list(me.id, query)
  }

  @Get('unread-count')
  unreadCount(@CurrentUser() me: AuthUser): Promise<UnreadCount> {
    return this.notifications.unreadCount(me.id)
  }

  // 07 진입 시 호출
  @Post('read-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  readAll(@CurrentUser() me: AuthUser): Promise<void> {
    return this.notifications.readAll(me.id)
  }
}
