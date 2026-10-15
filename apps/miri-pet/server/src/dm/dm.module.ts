import { Module, type OnModuleInit } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { MediaModule } from '../media/media.module'
import { MediaService } from '../media/media.service'
import { ModerationModule } from '../moderation/moderation.module'
import { ReportService } from '../moderation/report.service'
import { NotificationsModule } from '../notifications/notifications.module'
import { PrismaService } from '../prisma/prisma.service'
import { ConversationsService } from './conversations.service'
import { DmController } from './dm.controller'
import { DmGateway } from './dm.gateway'
import { createMessageReportTarget } from './message-report-target'
import { MessagesService } from './messages.service'
import { SocketAuthenticator } from './socket-auth'
import { DEFAULT_DM_SOCKET_LIMITS, DM_SOCKET_LIMITS } from './socket-limits'

// Phase 5 1:1 DM (D5): REST 쓰기 + socket.io 서버→클라 알림(경로 /socket.io, API 포트와 같은 HTTP 서버)
@Module({
  imports: [AuthModule, ModerationModule, MediaModule, NotificationsModule],
  controllers: [DmController],
  providers: [
    ConversationsService,
    MessagesService,
    DmGateway,
    SocketAuthenticator,
    { provide: DM_SOCKET_LIMITS, useValue: DEFAULT_DM_SOCKET_LIMITS },
  ],
})
export class DmModule implements OnModuleInit {
  constructor(
    private readonly reports: ReportService,
    private readonly prisma: PrismaService,
    private readonly media: MediaService,
  ) {}

  onModuleInit(): void {
    this.reports.registerHandler('MESSAGE', createMessageReportTarget(this.prisma, this.media))
  }
}
