import { Module } from '@nestjs/common';
import { BacktestController } from './backtest.controller';
import { BacktestService } from './backtest.service';
import { AccuracyService } from './accuracy.service';
import { TaEngineModule } from '../ta-engine/ta-engine.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TaEngineModule, AuthModule],
  controllers: [BacktestController],
  providers: [BacktestService, AccuracyService],
  exports: [BacktestService, AccuracyService],
})
export class BacktestModule {}
