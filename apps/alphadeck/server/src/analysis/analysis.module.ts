import { Module } from '@nestjs/common';
import { AnalysisController } from './analysis.controller';
import { AnalysisService } from './analysis.service';
import { MarketDataModule } from '../market-data/market-data.module';
import { TaEngineModule } from '../ta-engine/ta-engine.module';
import { LlmModule } from '../llm/llm.module';
import { BacktestModule } from '../backtest/backtest.module';

@Module({
  imports: [MarketDataModule, TaEngineModule, LlmModule, BacktestModule],
  controllers: [AnalysisController],
  providers: [AnalysisService],
  exports: [AnalysisService],
})
export class AnalysisModule {}
