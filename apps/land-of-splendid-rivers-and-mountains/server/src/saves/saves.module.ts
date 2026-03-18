import { Module } from '@nestjs/common'
import { SavesController } from './saves.controller'
import { SavesService } from './saves.service'

@Module({
  controllers: [SavesController],
  providers: [SavesService],
})
export class SavesModule {}
