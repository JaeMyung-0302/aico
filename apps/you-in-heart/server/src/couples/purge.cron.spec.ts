import { Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Test } from '@nestjs/testing'
import { PURGE_CRON_NAME, PurgeCron } from './purge.cron'
import { PurgeService } from './purge.service'

describe('PurgeCron', () => {
  const purge = { purgeDue: jest.fn() }

  const createCron = async (purgeEnabled: boolean) => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        PurgeCron,
        { provide: PurgeService, useValue: purge },
        { provide: ConfigService, useValue: new ConfigService({ purgeEnabled }) },
      ],
    }).compile()
    return moduleRef.get(PurgeCron)
  }

  beforeEach(() => {
    purge.purgeDue.mockReset()
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined)
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined)
  })

  afterEach(() => jest.restoreAllMocks())

  it('PURGE_ENABLED=false면 아무것도 하지 않는다', async () => {
    await (await createCron(false)).run()
    expect(purge.purgeDue).not.toHaveBeenCalled()
  })

  it('PURGE_ENABLED=true면 purgeDue를 1회 실행한다', async () => {
    purge.purgeDue.mockResolvedValue({ purged: 2, failed: 0 })
    await (await createCron(true)).run()
    expect(purge.purgeDue).toHaveBeenCalledTimes(1)
  })

  it('실패해도 예외를 올리지 않고 로그만 남긴다(다음 날 재시도)', async () => {
    purge.purgeDue.mockRejectedValue(new Error('db down'))
    await expect((await createCron(true)).run()).resolves.toBeUndefined()
    expect(Logger.prototype.error).toHaveBeenCalled()
  })

  it('매일 04:00 Asia/Seoul로 등록된다', () => {
    expect(PURGE_CRON_NAME).toBe('couple-purge')
    const metadata: unknown = Reflect.getMetadata('SCHEDULE_CRON_OPTIONS', PurgeCron.prototype.run)
    expect(metadata).toMatchObject({ cronTime: '0 0 4 * * *', timeZone: 'Asia/Seoul', name: PURGE_CRON_NAME })
  })
})
