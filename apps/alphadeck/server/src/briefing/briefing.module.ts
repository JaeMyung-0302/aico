import { Module } from '@nestjs/common';
import { BriefingController } from './briefing.controller';
import { BriefingService } from './briefing.service';
import { BriefingCron } from './briefing.cron';
import { AnalysisModule } from '../analysis/analysis.module';
import { LlmModule } from '../llm/llm.module';
import { NotificationModule } from '../notification/notification.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AnalysisModule, LlmModule, NotificationModule, AuthModule],
  controllers: [BriefingController],
  providers: [BriefingService, BriefingCron],
  exports: [BriefingService],
})
export class BriefingModule {}
