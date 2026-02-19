import { Module } from '@nestjs/common';
import { GameRunsService } from './game-runs.service';
import { GameRunsController } from './game-runs.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [GameRunsController],
  providers: [GameRunsService],
})
export class GameRunsModule {}
