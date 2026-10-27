import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { NotificationsModule } from '../notifications/notifications.module'
import { AnniversariesController } from './anniversaries.controller'
import { AnniversariesService } from './anniversaries.service'
import { AnniversaryReminderCron } from './anniversary-reminder.cron'
import { AnniversaryReminderService } from './anniversary-reminder.service'

// 오발송 핫픽스: providers에서 AnniversaryReminderCron만 빼면 발송이 멈춘다(데이터 영향 없음)
@Module({
  imports: [AuthModule, NotificationsModule],
  controllers: [AnniversariesController],
  providers: [AnniversariesService, AnniversaryReminderService, AnniversaryReminderCron],
})
export class AnniversariesModule {}
