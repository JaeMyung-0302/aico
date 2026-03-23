import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BriefingController } from './briefing.controller';
import { BriefingService } from './briefing.service';
import { BriefingCron } from './briefing.cron';
import { EmailService } from './email.service';
import { PushService } from './push.service';
import { NotificationService } from './notification.service';
import { AnalysisModule } from '../analysis/analysis.module';
import { LlmModule } from '../llm/llm.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [ConfigModule, AnalysisModule, LlmModule, AuthModule],
  controllers: [BriefingController],
  providers: [BriefingService, BriefingCron, EmailService, PushService, NotificationService],
  exports: [BriefingService, NotificationService],
})
export class BriefingModule {}
