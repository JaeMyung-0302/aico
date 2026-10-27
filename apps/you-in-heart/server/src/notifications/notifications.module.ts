import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { ExpoPushSender } from './expo-push.sender'
import { PushReceiptCron } from './push-receipt.cron'
import { PushTokensController } from './push-tokens.controller'
import { PUSH_SENDER, PushService } from './push.service'

// 기념일·새 기록 알림(Phase 1A)이 PushService.sendToUsers를 쓴다
@Module({
  imports: [AuthModule],
  controllers: [PushTokensController],
  providers: [PushService, PushReceiptCron, { provide: PUSH_SENDER, useClass: ExpoPushSender }],
  exports: [PushService],
})
export class NotificationsModule {}
