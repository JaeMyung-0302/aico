import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { configuration } from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { RunsModule } from './runs/runs.module';
import { UpgradesModule } from './upgrades/upgrades.module';
import { DailyModule } from './daily/daily.module';
import { ProfilesModule } from './profiles/profiles.module';
import { CharactersModule } from './characters/characters.module';
import { InventoryModule } from './inventory/inventory.module';
import { SavesModule } from './saves/saves.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 30 }]),
    PrismaModule,
    AuthModule,
    RunsModule,
    UpgradesModule,
    DailyModule,
    ProfilesModule,
    CharactersModule,
    InventoryModule,
    SavesModule,
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
