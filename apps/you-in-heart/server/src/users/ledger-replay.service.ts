import { Injectable } from '@nestjs/common'
import { PurgeService } from '../couples/purge.service'
import { UnlinkService } from '../couples/unlink.service'
import { AccountDeletionService } from './account-deletion.service'

export type LedgerReplayResult = { purgedCouples: number; unlinkedCouples: number; deletedUsers: number }

// 백업 복원 직후 R2 원장 3종을 다시 적용한다(ADR-003, docs/operations.md §3). 순서 고정:
// purge된 커플 삭제 → 연결 해제 유예 복구(원래 purgeAfter) → 탈퇴 재적용(커플이 이미 UNLINKING이라 유예를 늘리지 않는다)
@Injectable()
export class LedgerReplayService {
  constructor(
    private readonly purge: PurgeService,
    private readonly unlinks: UnlinkService,
    private readonly accountDeletion: AccountDeletionService,
  ) {}

  async replayAll(): Promise<LedgerReplayResult> {
    const { replayed } = await this.purge.replayLedger()
    const unlinkedCouples = await this.unlinks.replayLedger()
    const deletedUsers = await this.accountDeletion.replayLedger()
    return { purgedCouples: replayed, unlinkedCouples, deletedUsers }
  }
}
