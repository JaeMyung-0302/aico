import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { DiaryModule } from '../diary/diary.module'
import { EventsModule } from '../events/events.module'
import { KakaoLocalClient } from './kakao-local.client'
import { PlacesController } from './places.controller'
import { PlacesService } from './places.service'

// 핀의 일기 목록은 DiaryService(사진 서명 포함)를 그대로 쓴다
@Module({
  imports: [AuthModule, EventsModule, DiaryModule],
  controllers: [PlacesController],
  providers: [PlacesService, KakaoLocalClient],
})
export class PlacesModule {}
