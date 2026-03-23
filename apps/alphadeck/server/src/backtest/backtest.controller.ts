import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { BacktestService } from './backtest.service';
import { AuthGuard } from '../auth/guards/auth.guard';

class RunBacktestDto {
  symbol!: string;
  strategy!: string;
  periodDays?: number;
}

@Controller('backtest')
@UseGuards(AuthGuard)
export class BacktestController {
  constructor(private readonly backtestService: BacktestService) {}

  @Get('strategies')
  getStrategies() {
    return this.backtestService.getAvailableStrategies();
  }

  @Post()
  runBacktest(@Body() dto: RunBacktestDto) {
    return this.backtestService.runBacktest(
      dto.symbol,
      dto.strategy,
      dto.periodDays ?? 365,
    );
  }
}
