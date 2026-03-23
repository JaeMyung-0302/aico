import { Controller, Get, Param, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AnalysisService } from './analysis.service';
import { AnalysisQueryDto } from './dto/analysis-query.dto';

@Controller('analysis')
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  @Get(':symbol')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  async analyzeSymbol(
    @Param('symbol') symbol: string,
    @Query() _query: AnalysisQueryDto,
  ) {
    const upperSymbol = symbol.toUpperCase();
    return this.analysisService.analyzeSymbol(upperSymbol);
  }
}
