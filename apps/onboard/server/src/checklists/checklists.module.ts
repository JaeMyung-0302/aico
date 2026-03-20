import { Module } from '@nestjs/common'
import { ChecklistsController } from './checklists.controller'
import { ChecklistsService } from './checklists.service'

@Module({
  controllers: [ChecklistsController],
  providers: [ChecklistsService],
  exports: [ChecklistsService],
})
export class ChecklistsModule {}
