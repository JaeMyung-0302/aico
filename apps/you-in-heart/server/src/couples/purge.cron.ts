import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Cron } from '@nestjs/schedule'
import { PurgeService } from './purge.service'

export const PURGE_CRON_NAME = 'couple-purge'

// 매일 04:00 KST. PURGE_ENABLED=true일 때만 지운다(긴급 정지: docs/operations.md §4)
@Injectable()
export class PurgeCron {
  private readonly logger = new Logger(PurgeCron.name)

  constructor(
    private readonly purge: PurgeService,
    private readonly config: ConfigService,
  ) {}

  @Cron('0 0 4 * * *', { name: PURGE_CRON_NAME, timeZone: 'Asia/Seoul' })
  async run(): Promise<void> {
    if (this.config.get<boolean>('purgeEnabled') !== true) {
      this.logger.log('[purge] PURGE_ENABLED=false — skipped')
      return
    }
    try {
      const { purged, failed } = await this.purge.purgeDue()
      this.logger.log(`[purge] done purged=${purged} failed=${failed}`)
    } catch (error) {
      this.logger.error('[purge] run failed', error instanceof Error ? error.stack : error)
    }
  }
}
