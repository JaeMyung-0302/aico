import { Module, type OnModuleInit } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { EventsModule } from '../events/events.module'
import { ModerationModule } from '../moderation/moderation.module'
import { ReportService } from '../moderation/report.service'
import { NotificationsModule } from '../notifications/notifications.module'
import { PostsModule } from '../posts/posts.module'
import { PrismaService } from '../prisma/prisma.service'
import { CommentsService } from './comments.service'
import { createCommentReportTarget } from './comment-report-target'
import { FollowsService } from './follows.service'
import { LikesService } from './likes.service'
import { SocialController } from './social.controller'

// 좋아요·댓글·팔로우·사용자 검색(Phase 4). Phase 5 DM은 Follow로 맞팔을 판정한다
@Module({
  imports: [AuthModule, ModerationModule, PostsModule, NotificationsModule, EventsModule],
  controllers: [SocialController],
  providers: [LikesService, CommentsService, FollowsService],
})
export class SocialModule implements OnModuleInit {
  constructor(
    private readonly reports: ReportService,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit(): void {
    this.reports.registerHandler('COMMENT', createCommentReportTarget(this.prisma))
  }
}
