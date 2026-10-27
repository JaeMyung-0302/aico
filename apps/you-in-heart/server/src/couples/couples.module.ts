import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { EventsModule } from '../events/events.module'
import { NotificationsModule } from '../notifications/notifications.module'
import { StorageModule } from '../storage/storage.module'
import { CoupleGuard } from './couple.guard'
import { CouplesController } from './couples.controller'
import { CouplesService } from './couples.service'
import { InviteService } from './invite.service'
import { PurgeCron } from './purge.cron'
import { PurgeService } from './purge.service'
import { UnlinkService } from './unlink.service'

// CoupleGuard는 AppModule이 전역 APP_GUARD로 등록한다. UnlinkService는 회원 탈퇴(UsersModule)가 쓴다
@Module({
  imports: [AuthModule, NotificationsModule, EventsModule, StorageModule],
  controllers: [CouplesController],
  providers: [CoupleGuard, CouplesService, InviteService, UnlinkService, PurgeService, PurgeCron],
  exports: [CoupleGuard, UnlinkService, PurgeService],
})
export class CouplesModule {}
