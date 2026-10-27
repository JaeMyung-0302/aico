import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { CouplesModule } from '../couples/couples.module'
import { StorageModule } from '../storage/storage.module'
import { AccountDeletionService } from './account-deletion.service'
import { ConsentService } from './consent.service'
import { KakaoUnlinkClient } from './kakao-unlink.client'
import { LedgerReplayService } from './ledger-replay.service'
import { UsersController } from './users.controller'
import { UsersService } from './users.service'

// 회원 탈퇴(AccountDeletionService)는 CouplesModule의 UnlinkService와 KakaoUnlinkClient, 원장용 스토리지를 쓴다.
// 복원 재적용(LedgerReplayService)은 CouplesModule의 PurgeService·UnlinkService와 탈퇴 서비스를 묶는다
@Module({
  imports: [AuthModule, CouplesModule, StorageModule],
  controllers: [UsersController],
  providers: [UsersService, ConsentService, KakaoUnlinkClient, AccountDeletionService, LedgerReplayService],
  exports: [UsersService, ConsentService, KakaoUnlinkClient],
})
export class UsersModule {}
