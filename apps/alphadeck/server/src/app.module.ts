import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AnalysisModule } from './analysis/analysis.module';
import { LlmModule } from './llm/llm.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PortfolioModule } from './portfolio/portfolio.module';
import { BriefingModule } from './briefing/briefing.module';
import { PaymentModule } from './payment/payment.module';
import { SignalsModule } from './signals/signals.module';
import { TradeReviewModule } from './trade-review/trade-review.module';
import { BacktestModule } from './backtest/backtest.module';
import { AppController } from './app.controller';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      load: [configuration],
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 30 }]),
    PrismaModule,
    AnalysisModule,
    LlmModule,
    AuthModule,
    UsersModule,
    PortfolioModule,
    BriefingModule,
    PaymentModule,
    SignalsModule,
    TradeReviewModule,
    BacktestModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
