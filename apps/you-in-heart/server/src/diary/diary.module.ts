import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { EventsModule } from '../events/events.module'
import { PhotosModule } from '../photos/photos.module'
import { DiaryController } from './diary.controller'
import { DiaryService } from './diary.service'

@Module({
  imports: [AuthModule, EventsModule, PhotosModule],
  controllers: [DiaryController],
  providers: [DiaryService],
  exports: [DiaryService],
})
export class DiaryModule {}
