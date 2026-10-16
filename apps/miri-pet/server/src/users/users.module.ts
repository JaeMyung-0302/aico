import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { MediaModule } from '../media/media.module'
import { ModerationModule } from '../moderation/moderation.module'
import { AccountDeletionService } from './account-deletion.service'
import { ConsentService } from './consent.service'
import { KakaoUnlinkClient } from './kakao-unlink.client'
import { UsersController } from './users.controller'
import { UsersService } from './users.service'

@Module({
  imports: [AuthModule, ModerationModule, MediaModule],
  controllers: [UsersController],
  providers: [UsersService, ConsentService, AccountDeletionService, KakaoUnlinkClient],
  exports: [UsersService, ConsentService],
})
export class UsersModule {}
