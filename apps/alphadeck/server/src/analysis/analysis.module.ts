import { Module } from '@nestjs/common';
import { AnalysisController } from './analysis.controller';
import { AnalysisService } from './analysis.service';
import { MarketDataModule } from '../market-data/market-data.module';
import { TaEngineModule } from '../ta-engine/ta-engine.module';

@Module({
  imports: [MarketDataModule, TaEngineModule],
  controllers: [AnalysisController],
  providers: [AnalysisService],
  exports: [AnalysisService],
})
export class AnalysisModule {}
