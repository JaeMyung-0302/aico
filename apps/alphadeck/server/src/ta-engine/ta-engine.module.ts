import { Module } from '@nestjs/common';
import { TaEngineService } from './ta-engine.service';

@Module({
  providers: [TaEngineService],
  exports: [TaEngineService],
})
export class TaEngineModule {}
