import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { ConsentService } from './consent.service'
import { KakaoUnlinkClient } from './kakao-unlink.client'
import { UsersController } from './users.controller'
import { UsersService } from './users.service'

// KakaoUnlinkClient는 0E 회원 탈퇴(AccountDeletionService)가 쓴다
@Module({
  imports: [AuthModule],
  controllers: [UsersController],
  providers: [UsersService, ConsentService, KakaoUnlinkClient],
  exports: [UsersService, ConsentService, KakaoUnlinkClient],
})
export class UsersModule {}
