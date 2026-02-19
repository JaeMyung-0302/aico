import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ProfilesModule } from './profiles/profiles.module';
import { GrowthModule } from './growth/growth.module';
import { GameRunsModule } from './game-runs/game-runs.module';
import { ArchiveModule } from './archive/archive.module';
import { LeaderboardModule } from './leaderboard/leaderboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    ProfilesModule,
    GrowthModule,
    GameRunsModule,
    ArchiveModule,
    LeaderboardModule,
  ],
})
export class AppModule {}
