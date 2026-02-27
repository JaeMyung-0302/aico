import { Module } from '@nestjs/common'
import { SavesController } from './saves.controller'
import { SavesService } from './saves.service'
import { AuthModule } from '../auth/auth.module'

@Module({
  imports: [AuthModule],
  controllers: [SavesController],
  providers: [SavesService],
})
export class SavesModule {}
