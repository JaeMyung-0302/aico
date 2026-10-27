import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { StorageModule } from '../storage/storage.module'
import { ConsentModule } from '../users/consent.module'
import { ImageSanitizer } from './image-sanitizer'
import { PhotoCleanupCron } from './photo-cleanup.cron'
import { PhotosController } from './photos.controller'
import { PhotosService } from './photos.service'

// DiaryModule이 PhotosService로 일기 응답의 사진 URL 서명·삭제 시 객체 정리를 한다.
// QuotesModule은 ImageSanitizer를 공유한다(인스턴스 하나 = 동시 재인코딩 상한 하나)
@Module({
  imports: [AuthModule, StorageModule, ConsentModule],
  controllers: [PhotosController],
  providers: [PhotosService, ImageSanitizer, PhotoCleanupCron],
  exports: [PhotosService, ImageSanitizer],
})
export class PhotosModule {}
