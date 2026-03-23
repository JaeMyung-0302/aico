import { Module } from '@nestjs/common';
import { SignalsController } from './signals.controller';
import { SignalsService } from './signals.service';
import { SignalsCron } from './signals.cron';
import { AnalysisModule } from '../analysis/analysis.module';
import { BriefingModule } from '../briefing/briefing.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AnalysisModule, BriefingModule, AuthModule],
  controllers: [SignalsController],
  providers: [SignalsService, SignalsCron],
  exports: [SignalsService],
})
export class SignalsModule {}
