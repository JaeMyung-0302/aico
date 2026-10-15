import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common'
import {
  type Conversation,
  type ConversationListQuery,
  conversationListQuerySchema,
  type ConversationPage,
  type CreateConversationRequest,
  createConversationRequestSchema,
  idSchema,
  type MarkReadRequest,
  markReadRequestSchema,
  type Message,
  type MessageListQuery,
  messageListQuerySchema,
  type MessagePage,
  type SendMessageRequest,
  sendMessageRequestSchema,
} from '@miri-pet/shared'
import { Authenticated } from '../auth/decorators/authenticated.decorator'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import type { AuthUser } from '../auth/guards/jwt-auth.guard'
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe'
import { UserThrottle } from '../common/throttle/user-throttle.guard'
import { ConversationsService } from './conversations.service'
import { MessagesService } from './messages.service'

const idPipe = new ZodValidationPipe(idSchema)

// 사용자당 메시지 전송 1분 60회
export const DM_SEND_THROTTLE = { ttl: 60_000, limit: 60 }
// 보안 리뷰 MEDIUM-1: 사용자당 대화 열기 1시간 30회(요청 스팸 1차 방어. 하루 새 요청 상한은 MessagesService)
export const DM_OPEN_THROTTLE = { ttl: 60 * 60_000, limit: 30 }

@Controller('dm/conversations')
@Authenticated()
export class DmController {
  constructor(
    private readonly conversations: ConversationsService,
    private readonly messages: MessagesService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @UserThrottle({ name: 'dm-open', ...DM_OPEN_THROTTLE })
  open(
    @CurrentUser() me: AuthUser,
    @Body(new ZodValidationPipe(createConversationRequestSchema)) body: CreateConversationRequest,
  ): Promise<Conversation> {
    return this.conversations.open(me.id, body.userId)
  }

  @Get()
  list(
    @CurrentUser() me: AuthUser,
    @Query(new ZodValidationPipe(conversationListQuerySchema)) query: ConversationListQuery,
  ): Promise<ConversationPage> {
    return this.conversations.list(me.id, query)
  }

  @Get(':id')
  get(@CurrentUser() me: AuthUser, @Param('id', idPipe) id: string): Promise<Conversation> {
    return this.conversations.get(me.id, id)
  }

  @Post(':id/accept')
  @HttpCode(HttpStatus.OK)
  accept(@CurrentUser() me: AuthUser, @Param('id', idPipe) id: string): Promise<Conversation> {
    return this.conversations.accept(me.id, id)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  hide(@CurrentUser() me: AuthUser, @Param('id', idPipe) id: string): Promise<void> {
    return this.conversations.hide(me.id, id)
  }

  @Get(':id/messages')
  listMessages(
    @CurrentUser() me: AuthUser,
    @Param('id', idPipe) id: string,
    @Query(new ZodValidationPipe(messageListQuerySchema)) query: MessageListQuery,
  ): Promise<MessagePage> {
    return this.messages.list(me.id, id, query)
  }

  @Post(':id/messages')
  @UserThrottle({ name: 'dm-send', ...DM_SEND_THROTTLE })
  send(
    @CurrentUser() me: AuthUser,
    @Param('id', idPipe) id: string,
    @Body(new ZodValidationPipe(sendMessageRequestSchema)) body: SendMessageRequest,
  ): Promise<Message> {
    return this.messages.send(me.id, id, body)
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  read(
    @CurrentUser() me: AuthUser,
    @Param('id', idPipe) id: string,
    @Body(new ZodValidationPipe(markReadRequestSchema)) body: MarkReadRequest,
  ): Promise<void> {
    return this.messages.markRead(me.id, id, body.lastReadMessageId)
  }
}
