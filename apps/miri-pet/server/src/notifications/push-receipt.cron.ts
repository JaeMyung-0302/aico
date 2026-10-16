import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { PushService } from './push.service'

// 15분마다 Expo receipt를 확인해 DeviceNotRegistered 토큰을 지운다 (D6)
@Injectable()
export class PushReceiptCron {
  private readonly logger = new Logger(PushReceiptCron.name)

  constructor(private readonly push: PushService) {}

  @Cron('0 */15 * * * *', { name: 'push-receipts' })
  async handle(): Promise<void> {
    try {
      await this.push.checkReceipts()
    } catch (error) {
      this.logger.error('[push] receipt check failed', error instanceof Error ? error.stack : error)
    }
  }
}
