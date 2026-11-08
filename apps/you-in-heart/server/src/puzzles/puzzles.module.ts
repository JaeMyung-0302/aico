import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { StorageModule } from '../storage/storage.module'
import { PuzzlesController } from './puzzles.controller'
import { PuzzlesService } from './puzzles.service'

@Module({
  imports: [AuthModule, StorageModule],
  controllers: [PuzzlesController],
  providers: [PuzzlesService],
})
export class PuzzlesModule {}
