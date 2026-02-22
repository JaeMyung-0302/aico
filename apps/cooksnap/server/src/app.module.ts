import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { RecipesModule } from './recipes/recipes.module';
import { GeminiModule } from './gemini/gemini.module';
import { KamisModule } from './kamis/kamis.module';
import { CoupangModule } from './coupang/coupang.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PremiumModule } from './premium/premium.module';
import { PaymentModule } from './payment/payment.module';
import { FeedbackModule } from './feedback/feedback.module';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 30 }]),
    PrismaModule,
    RecipesModule,
    GeminiModule,
    KamisModule,
    CoupangModule,
    AuthModule,
    UsersModule,
    PremiumModule,
    PaymentModule,
    FeedbackModule,
  ],
  controllers: [AppController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
