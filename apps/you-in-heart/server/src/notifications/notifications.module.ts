import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { EventsModule } from '../events/events.module'
import { CoupleNotifier } from './couple-notifier'
import { ExpoPushSender } from './expo-push.sender'
import { PushReceiptCron } from './push-receipt.cron'
import { PushTokensController } from './push-tokens.controller'
import { PUSH_SENDER, PushService } from './push.service'

// 커플 알림(기념일·새 기록·사귄 날·해제·내보내기)은 CoupleNotifier로 보내 notification_sent를 함께 남긴다
@Module({
  imports: [AuthModule, EventsModule],
  controllers: [PushTokensController],
  providers: [PushService, CoupleNotifier, PushReceiptCron, { provide: PUSH_SENDER, useClass: ExpoPushSender }],
  exports: [PushService, CoupleNotifier],
})
export class NotificationsModule {}
