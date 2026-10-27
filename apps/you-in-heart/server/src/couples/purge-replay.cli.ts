// 백업 복원 직후 실행: R2 system/purge-ledger/ 원장의 커플을 DB·R2에서 다시 지운다(ADR-003, docs/operations.md §3)
// 사용: pnpm --filter @you-in-heart/server purge:replay (빌드 후 dist에서 실행)
import { Logger } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { AppModule } from '../app.module'
import { PurgeService } from './purge.service'

const replay = async () => {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['log', 'warn', 'error'] })
  try {
    const { replayed } = await app.get(PurgeService).replayLedger()
    Logger.log(`[purge-replay] ledger entries=${replayed}`, 'PurgeReplay')
  } finally {
    await app.close()
  }
}

replay().catch((error) => {
  Logger.error('[purge-replay] failed', error instanceof Error ? error.stack : String(error), 'PurgeReplay')
  process.exit(1)
})
