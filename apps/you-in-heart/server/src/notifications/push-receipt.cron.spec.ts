import { Logger } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { PushReceiptCron } from './push-receipt.cron'
import { PushService } from './push.service'

describe('PushReceiptCron', () => {
  const push = { checkReceipts: jest.fn() }
  let cron: PushReceiptCron

  beforeEach(async () => {
    push.checkReceipts.mockReset()
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined)
    const moduleRef = await Test.createTestingModule({
      providers: [PushReceiptCron, { provide: PushService, useValue: push }],
    }).compile()
    cron = moduleRef.get(PushReceiptCron)
  })

  afterEach(() => jest.restoreAllMocks())

  it('15분마다 receipt를 확인한다', async () => {
    push.checkReceipts.mockResolvedValue({ checked: 1, removedTokens: 0 })
    await cron.handle()
    expect(push.checkReceipts).toHaveBeenCalledTimes(1)
  })

  it('확인이 실패해도 예외를 올리지 않고 로그만 남긴다(다음 주기에 재시도)', async () => {
    push.checkReceipts.mockRejectedValue(new Error('expo 503'))
    await expect(cron.handle()).resolves.toBeUndefined()
    expect(Logger.prototype.error).toHaveBeenCalled()
  })
})
