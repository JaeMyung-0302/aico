import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NotificationService } from './notification.service';
import { EmailService } from './email.service';
import { PushService } from './push.service';

@Module({
  imports: [ConfigModule],
  providers: [NotificationService, EmailService, PushService],
  exports: [NotificationService],
})
export class NotificationModule {}
