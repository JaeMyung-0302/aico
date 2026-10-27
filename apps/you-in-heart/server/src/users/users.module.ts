import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { CouplesModule } from '../couples/couples.module'
import { AccountDeletionService } from './account-deletion.service'
import { ConsentService } from './consent.service'
import { KakaoUnlinkClient } from './kakao-unlink.client'
import { UsersController } from './users.controller'
import { UsersService } from './users.service'

// 회원 탈퇴(AccountDeletionService)는 CouplesModule의 UnlinkService와 KakaoUnlinkClient를 쓴다
@Module({
  imports: [AuthModule, CouplesModule],
  controllers: [UsersController],
  providers: [UsersService, ConsentService, KakaoUnlinkClient, AccountDeletionService],
  exports: [UsersService, ConsentService, KakaoUnlinkClient],
})
export class UsersModule {}
