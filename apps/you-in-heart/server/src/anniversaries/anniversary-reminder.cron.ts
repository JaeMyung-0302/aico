import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Cron } from '@nestjs/schedule'
import { AnniversaryReminderService } from './anniversary-reminder.service'

const REMINDER_HOUR_KST = 9
const KST_OFFSET_HOURS = 9

const kstHour = (now: Date): number => (now.getUTCHours() + KST_OFFSET_HOURS) % 24

// 재시작 중 09:00을 놓쳤으면 부팅 때 당일분을 1회 실행한다(NotificationLog 유니크가 중복을 막는다, MiriPet 선례).
// 테스트 앱(NODE_ENV=test) 또는 REMINDER_BOOT_CATCHUP=false면 하지 않는다
export const shouldCatchUpOnBoot = (now: Date, nodeEnv: string, bootCatchUp?: string): boolean =>
  nodeEnv !== 'test' && bootCatchUp !== 'false' && kstHour(now) >= REMINDER_HOUR_KST

@Injectable()
export class AnniversaryReminderCron implements OnApplicationBootstrap {
  private readonly logger = new Logger(AnniversaryReminderCron.name)

  constructor(
    private readonly reminders: AnniversaryReminderService,
    private readonly config: ConfigService,
  ) {}

  @Cron('0 0 9 * * *', { name: 'anniversary-reminder', timeZone: 'Asia/Seoul' })
  async handle(): Promise<void> {
    try {
      await this.reminders.runOnce()
    } catch (error) {
      this.logger.error('[anniversary] run failed', error instanceof Error ? error.stack : error)
    }
  }

  onApplicationBootstrap(): void {
    const nodeEnv = this.config.get<string>('nodeEnv') ?? 'development'
    const bootCatchUp = this.config.get<string>('REMINDER_BOOT_CATCHUP')
    // 부팅을 막지 않도록 기다리지 않는다(handle이 예외를 삼킨다)
    if (shouldCatchUpOnBoot(new Date(), nodeEnv, bootCatchUp)) void this.handle()
  }
}
