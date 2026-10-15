import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { ImageSanitizer } from './image-sanitizer'
import { MediaCleanupCron } from './media-cleanup.cron'
import { MediaController } from './media.controller'
import { MediaService } from './media.service'
import { OBJECT_STORAGE } from './object-storage'
import { R2ObjectStorage } from './r2.client'

// Phase 4(피드·DM 이미지)도 MediaService.createUpload/complete/assertUsable/purgeMedia를 그대로 쓴다
@Module({
  imports: [AuthModule],
  controllers: [MediaController],
  providers: [MediaService, ImageSanitizer, MediaCleanupCron, { provide: OBJECT_STORAGE, useClass: R2ObjectStorage }],
  exports: [MediaService],
})
export class MediaModule {}
