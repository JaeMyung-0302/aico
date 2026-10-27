import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { CouplesModule } from '../couples/couples.module'
import { EventsModule } from '../events/events.module'
import { PhotosModule } from '../photos/photos.module'
import { DiaryController } from './diary.controller'
import { DiaryService } from './diary.service'

@Module({
  imports: [AuthModule, CouplesModule, EventsModule, PhotosModule],
  controllers: [DiaryController],
  providers: [DiaryService],
  exports: [DiaryService],
})
export class DiaryModule {}
