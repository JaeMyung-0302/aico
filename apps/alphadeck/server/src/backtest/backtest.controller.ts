import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { IsString, IsOptional, IsNumber } from 'class-validator';
import { BacktestService } from './backtest.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { PlanGuard, RequirePlan } from '../common/guards/plan.guard';

class RunBacktestDto {
  @IsString()
  symbol!: string;

  @IsString()
  strategy!: string;

  @IsOptional()
  @IsNumber()
  periodDays?: number;
}

@Controller('backtest')
@UseGuards(AuthGuard, PlanGuard)
@RequirePlan('MAX')
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
