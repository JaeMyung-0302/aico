import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { ModerationModule } from '../moderation/moderation.module'
import { ExpoPushSender } from './expo-push.sender'
import { InAppNotificationService } from './in-app-notification.service'
import { NotificationsController } from './notifications.controller'
import { NotificationsService } from './notifications.service'
import { PushReceiptCron } from './push-receipt.cron'
import { PushTokensController } from './push-tokens.controller'
import { PUSH_SENDER, PushService } from './push.service'
import { SocialPushService } from './social-push.service'

// 푸시(Phase 2) + 인앱 알림함·소셜 푸시(Phase 4). social 모듈이 InAppNotificationService.notify를 부른다
@Module({
  imports: [AuthModule, ModerationModule],
  controllers: [PushTokensController, NotificationsController],
  providers: [
    PushService,
    PushReceiptCron,
    { provide: PUSH_SENDER, useClass: ExpoPushSender },
    SocialPushService,
    InAppNotificationService,
    NotificationsService,
  ],
  exports: [PushService, InAppNotificationService],
})
export class NotificationsModule {}
