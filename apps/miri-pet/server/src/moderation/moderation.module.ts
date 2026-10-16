import { Module, type OnModuleInit } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { PrismaService } from '../prisma/prisma.service'
import { BlockService } from './block.service'
import { BlocksController, ReportsController } from './moderation.controller'
import { ReportService } from './report.service'
import { UserSuspensionService } from './user-suspension.service'
import { createUserReportTarget } from './user-report-target'

// BlockService(hiddenUserIds)·ReportService(registerHandler)는 이후 Phase가 import한다
@Module({
  imports: [AuthModule],
  controllers: [BlocksController, ReportsController],
  providers: [BlockService, ReportService, UserSuspensionService],
  exports: [BlockService, ReportService, UserSuspensionService],
})
export class ModerationModule implements OnModuleInit {
  constructor(
    private readonly reports: ReportService,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit(): void {
    this.reports.registerHandler('USER', createUserReportTarget(this.prisma.user))
  }
}
