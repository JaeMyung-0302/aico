import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { EventsModule } from '../events/events.module'
import { StorageModule } from '../storage/storage.module'
import { DiaryController } from './diary.controller'
import { DiaryService } from './diary.service'

@Module({
  imports: [AuthModule, EventsModule, StorageModule],
  controllers: [DiaryController],
  providers: [DiaryService],
  exports: [DiaryService],
})
export class DiaryModule {}
