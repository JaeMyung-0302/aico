import { Controller, Get, Post, Body, Param, Headers, UseGuards, Req } from '@nestjs/common'
import { ChatService } from './chat.service'
import { AuthGuard } from '../auth/guards/auth.guard'
import { AskQuestionDto } from './dto/ask-question.dto'
import { CreateSessionDto } from './dto/create-session.dto'
import type { AuthenticatedRequest } from '../common/interfaces/authenticated-request'

@Controller('chat')
@UseGuards(AuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('sessions')
  createSession(
    @Body() dto: CreateSessionDto,
    @Headers('x-tenant-id') tenantId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.chatService.createSession(req.user.id, tenantId, dto.title)
  }

  @Get('sessions')
  getSessions(
    @Headers('x-tenant-id') tenantId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.chatService.getSessions(req.user.id, tenantId)
  }

  @Get('sessions/:id')
  getSessionMessages(
    @Param('id') id: string,
    @Headers('x-tenant-id') tenantId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.chatService.getSessionMessages(id, req.user.id, tenantId)
  }

  @Post('sessions/:id/messages')
  askQuestion(
    @Param('id') id: string,
    @Body() dto: AskQuestionDto,
    @Headers('x-tenant-id') tenantId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.chatService.askQuestion(id, dto.query, req.user.id, tenantId)
  }
}
