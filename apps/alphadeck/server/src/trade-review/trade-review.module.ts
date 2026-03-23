import { Module } from '@nestjs/common';
import { TradeReviewController } from './trade-review.controller';
import { TradeReviewService } from './trade-review.service';
import { TaEngineModule } from '../ta-engine/ta-engine.module';
import { MarketDataModule } from '../market-data/market-data.module';
import { LlmModule } from '../llm/llm.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TaEngineModule, MarketDataModule, LlmModule, AuthModule],
  controllers: [TradeReviewController],
  providers: [TradeReviewService],
  exports: [TradeReviewService],
})
export class TradeReviewModule {}
