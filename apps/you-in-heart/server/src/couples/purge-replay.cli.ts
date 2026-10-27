// 백업 복원 직후 실행: R2 원장(system/purge-ledger/·unlinked-couples/·deleted-users/)을 DB에 다시 적용한다
// (ADR-003, docs/operations.md §3)
// 사용: pnpm --filter @you-in-heart/server purge:replay (빌드 후 dist에서 실행)
import { Logger } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { AppModule } from '../app.module'
import { LedgerReplayService } from '../users/ledger-replay.service'

const replay = async () => {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['log', 'warn', 'error'] })
  try {
    const { purgedCouples, unlinkedCouples, deletedUsers } = await app.get(LedgerReplayService).replayAll()
    Logger.log(
      `[purge-replay] purged=${purgedCouples} unlinked=${unlinkedCouples} deletedUsers=${deletedUsers}`,
      'PurgeReplay',
    )
  } finally {
    await app.close()
  }
}

replay().catch((error) => {
  Logger.error('[purge-replay] failed', error instanceof Error ? error.stack : String(error), 'PurgeReplay')
  process.exit(1)
})
