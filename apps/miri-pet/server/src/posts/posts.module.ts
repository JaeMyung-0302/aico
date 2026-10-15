import { Module, type OnModuleInit } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { EventsModule } from '../events/events.module'
import { MediaModule } from '../media/media.module'
import { ModerationModule } from '../moderation/moderation.module'
import { ReportService } from '../moderation/report.service'
import { PrismaService } from '../prisma/prisma.service'
import { FeedService } from './feed.service'
import { createPostReportTarget } from './post-report-target'
import { PostsController } from './posts.controller'
import { PostsRepository } from './posts.repository'
import { PostsService } from './posts.service'

// 게시물·피드(Phase 4). PostsRepository는 social(좋아요·댓글)이 대상 확인에 쓴다
@Module({
  imports: [AuthModule, ModerationModule, MediaModule, EventsModule],
  controllers: [PostsController],
  providers: [PostsRepository, PostsService, FeedService],
  exports: [PostsRepository],
})
export class PostsModule implements OnModuleInit {
  constructor(
    private readonly reports: ReportService,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit(): void {
    this.reports.registerHandler('POST', createPostReportTarget(this.prisma.post))
  }
}
