import { type MiddlewareConsumer, Module, type NestModule } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { EventsModule } from '../events/events.module'
import { PhotosModule } from '../photos/photos.module'
import { StorageModule } from '../storage/storage.module'
import { QuoteBodyLimitMiddleware } from './quote-body-limit.middleware'
import { QuoteCleanupCron } from './quote-cleanup.cron'
import { QuotesController } from './quotes.controller'
import { QuotesService } from './quotes.service'

// 스크린샷 재인코딩은 사진과 같은 ImageSanitizer 인스턴스(동시 작업 상한 공유)를 쓴다
@Module({
  imports: [AuthModule, EventsModule, StorageModule, PhotosModule],
  controllers: [QuotesController],
  providers: [QuotesService, QuoteCleanupCron],
})
export class QuotesModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(QuoteBodyLimitMiddleware).forRoutes(QuotesController)
  }
}
