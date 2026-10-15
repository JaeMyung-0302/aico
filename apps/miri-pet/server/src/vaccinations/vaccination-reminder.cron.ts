import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Cron } from '@nestjs/schedule'
import { kstHour } from './kst-date'
import { VaccinationReminderService } from './vaccination-reminder.service'

const REMINDER_HOUR_KST = 10

// 재시작 중 10:00을 놓쳤으면 부팅 때 당일분을 1회 실행한다(NotificationLog가 중복을 막는다).
// 테스트 앱(NODE_ENV=test) 또는 REMINDER_BOOT_CATCHUP=false(통합 테스트 setup)면 하지 않는다
export const shouldCatchUpOnBoot = (now: Date, nodeEnv: string, bootCatchUp?: string): boolean =>
  nodeEnv !== 'test' && bootCatchUp !== 'false' && kstHour(now) >= REMINDER_HOUR_KST

@Injectable()
export class VaccinationReminderCron implements OnApplicationBootstrap {
  private readonly logger = new Logger(VaccinationReminderCron.name)

  constructor(
    private readonly reminders: VaccinationReminderService,
    private readonly config: ConfigService,
  ) {}

  @Cron('0 10 * * *', { name: 'vaccination-reminder', timeZone: 'Asia/Seoul' })
  async handle(): Promise<void> {
    try {
      await this.reminders.runOnce()
    } catch (error) {
      this.logger.error('[reminder] run failed', error instanceof Error ? error.stack : error)
    }
  }

  onApplicationBootstrap(): void {
    const nodeEnv = this.config.get<string>('nodeEnv') ?? 'development'
    const bootCatchUp = this.config.get<string>('REMINDER_BOOT_CATCHUP')
    // 부팅을 막지 않도록 기다리지 않는다(handle이 예외를 삼킨다)
    if (shouldCatchUpOnBoot(new Date(), nodeEnv, bootCatchUp)) void this.handle()
  }
}
