import { Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Test } from '@nestjs/testing'
import { shouldCatchUpOnBoot, VaccinationReminderCron } from './vaccination-reminder.cron'
import { VaccinationReminderService } from './vaccination-reminder.service'

describe('shouldCatchUpOnBoot', () => {
  it('KST 10시 이후 부팅이면 당일분을 1회 실행한다', () => {
    expect(shouldCatchUpOnBoot(new Date('2026-10-13T01:00:00Z'), 'production')).toBe(true)
    expect(shouldCatchUpOnBoot(new Date('2026-10-13T14:59:00Z'), 'development')).toBe(true)
  })

  it('KST 10시 이전 부팅이면 크론에 맡긴다', () => {
    expect(shouldCatchUpOnBoot(new Date('2026-10-13T00:59:00Z'), 'production')).toBe(false)
    // UTC 15:00 = KST 다음 날 0시
    expect(shouldCatchUpOnBoot(new Date('2026-10-13T15:00:00Z'), 'production')).toBe(false)
  })

  it('테스트 환경에서는 부팅 실행을 하지 않는다', () => {
    expect(shouldCatchUpOnBoot(new Date('2026-10-13T05:00:00Z'), 'test')).toBe(false)
  })

  it('REMINDER_BOOT_CATCHUP=false면 NODE_ENV와 상관없이 하지 않는다 (통합 테스트가 production 모드로 앱을 띄울 때)', () => {
    expect(shouldCatchUpOnBoot(new Date('2026-10-13T05:00:00Z'), 'production', 'false')).toBe(false)
    expect(shouldCatchUpOnBoot(new Date('2026-10-13T05:00:00Z'), 'production', 'true')).toBe(true)
  })
})

describe('VaccinationReminderCron.handle', () => {
  afterEach(() => jest.restoreAllMocks())

  it('실행 실패는 로그만 남기고 크론을 죽이지 않는다', async () => {
    const runOnce = jest.fn().mockRejectedValue(new Error('db down'))
    const error = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined)
    const moduleRef = await Test.createTestingModule({
      providers: [
        VaccinationReminderCron,
        { provide: VaccinationReminderService, useValue: { runOnce } },
        { provide: ConfigService, useValue: new ConfigService({ nodeEnv: 'test' }) },
      ],
    }).compile()
    const cron = moduleRef.get(VaccinationReminderCron)
    await expect(cron.handle()).resolves.toBeUndefined()
    expect(runOnce).toHaveBeenCalledTimes(1)
    expect(error).toHaveBeenCalled()
  })
})
