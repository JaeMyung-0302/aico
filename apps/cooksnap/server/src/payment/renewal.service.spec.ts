import { Test, TestingModule } from '@nestjs/testing'
import { RenewalService } from './renewal.service'
import { PrismaService } from '../prisma/prisma.service'
import { PortoneService } from '../portone/portone.service'
import { MAX_RETRY_COUNT, SUBSCRIPTION_DAYS, SUBSCRIPTION_PRICE } from './constants'

jest.mock('../common/utils/crypto', () => ({
  decrypt: jest.fn((v: string) => v.replace('enc:', '')),
}))

const makeSub = (overrides = {}) => ({
  id: 'sub-1',
  userId: 'user-1',
  billingKey: 'enc:bk-1',
  currentPeriodEnd: new Date(Date.now() - 1000), // 이미 만료
  retryCount: 0,
  ...overrides,
})

describe('RenewalService', () => {
  let service: RenewalService
  let prisma: {
    subscription: Record<string, jest.Mock>
    payment: Record<string, jest.Mock>
    user: Record<string, jest.Mock>
    $transaction: jest.Mock
  }
  let portone: Record<string, jest.Mock>

  beforeEach(async () => {
    const mockPrisma = {
      subscription: {
        findMany: jest.fn(),
        update: jest.fn(),
      },
      payment: { create: jest.fn() },
      user: { update: jest.fn() },
      $transaction: jest
        .fn()
        .mockImplementation((ops: Promise<unknown>[]) => Promise.all(ops)),
    }

    const mockPortone = {
      isAvailable: jest.fn(),
      chargeBillingKey: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RenewalService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: PortoneService, useValue: mockPortone },
      ],
    }).compile()

    service = module.get<RenewalService>(RenewalService)
    prisma = module.get(PrismaService) as typeof prisma
    portone = module.get(PortoneService) as typeof portone
  })

  describe('handleRenewals', () => {
    it('포트원 미설정 시 DB 조회 없이 종료', async () => {
      portone.isAvailable.mockReturnValue(false)

      await service.handleRenewals()

      expect(prisma.subscription.findMany).not.toHaveBeenCalled()
    })

    it('동시 실행 가드: 두 번째 호출은 즉시 리턴', async () => {
      portone.isAvailable.mockReturnValue(true)
      let resolveFindMany!: (v: unknown[]) => void
      prisma.subscription.findMany
        .mockReturnValueOnce(
          new Promise((resolve) => {
            resolveFindMany = resolve
          }),
        )
        .mockResolvedValue([]) // 이후 PAST_DUE 조회용

      const first = service.handleRenewals()
      // 두 번째 호출 — isRunning이 true이므로 즉시 리턴해야 함
      await service.handleRenewals()

      expect(prisma.subscription.findMany).toHaveBeenCalledTimes(1)

      resolveFindMany([]) // 첫 번째 완료 (PAST_DUE 조회가 추가 호출됨)
      await first
    })

    it('갱신 성공: ACTIVE + 새 periodEnd + payment PAID + user 업데이트', async () => {
      portone.isAvailable.mockReturnValue(true)
      const sub = makeSub()
      // ACTIVE 조회 → [sub], PAST_DUE 조회 → []
      prisma.subscription.findMany
        .mockResolvedValueOnce([sub])
        .mockResolvedValueOnce([])
      portone.chargeBillingKey.mockResolvedValue({ status: 'PAID', id: 'p-1' })
      prisma.subscription.update.mockResolvedValue({})
      prisma.payment.create.mockResolvedValue({})
      prisma.user.update.mockResolvedValue({})

      await service.handleRenewals()

      const txCall = prisma.$transaction.mock.calls[0][0] as unknown[]
      expect(txCall).toHaveLength(3) // subscription.update + payment.create + user.update

      const subUpdateCall = prisma.subscription.update.mock.calls[0][0]
      expect(subUpdateCall.data.status).toBe('ACTIVE')
      expect(subUpdateCall.data.retryCount).toBe(0)

      const expectedNewEnd = new Date(
        sub.currentPeriodEnd.getTime() + SUBSCRIPTION_DAYS * 86400_000,
      )
      expect(subUpdateCall.data.currentPeriodEnd.getTime()).toBeCloseTo(
        expectedNewEnd.getTime(),
        -3,
      )

      const paymentCreateCall = prisma.payment.create.mock.calls[0][0]
      expect(paymentCreateCall.data.status).toBe('PAID')
      expect(paymentCreateCall.data.amount).toBe(SUBSCRIPTION_PRICE)
    })

    it('첫 번째 갱신 실패: PAST_DUE + retryCount++ + grace 연장', async () => {
      portone.isAvailable.mockReturnValue(true)
      const sub = makeSub({ retryCount: 0 })
      prisma.subscription.findMany
        .mockResolvedValueOnce([sub])
        .mockResolvedValueOnce([])
      portone.chargeBillingKey.mockRejectedValue(new Error('카드 한도 초과'))
      prisma.subscription.update.mockResolvedValue({})
      prisma.payment.create.mockResolvedValue({})
      prisma.user.update.mockResolvedValue({})

      await service.handleRenewals()

      const subUpdateCall = prisma.subscription.update.mock.calls[0][0]
      expect(subUpdateCall.data.status).toBe('PAST_DUE')
      expect(subUpdateCall.data.retryCount).toBe(1)

      const userUpdateCall = prisma.user.update.mock.calls[0][0]
      // grace extension: isPremium 유지, premiumExpiresAt 연장
      expect(userUpdateCall.data.isPremium).toBeUndefined()
      expect(userUpdateCall.data.premiumExpiresAt).toBeInstanceOf(Date)
    })

    it(`${MAX_RETRY_COUNT}회 실패 시 EXPIRED + isPremium: false`, async () => {
      portone.isAvailable.mockReturnValue(true)
      // retryCount가 MAX_RETRY_COUNT - 1이면 nextRetryCount === MAX_RETRY_COUNT → EXPIRED
      const sub = makeSub({ retryCount: MAX_RETRY_COUNT - 1 })
      prisma.subscription.findMany
        .mockResolvedValueOnce([sub])
        .mockResolvedValueOnce([])
      portone.chargeBillingKey.mockRejectedValue(new Error('결제 거절'))
      prisma.subscription.update.mockResolvedValue({})
      prisma.payment.create.mockResolvedValue({})
      prisma.user.update.mockResolvedValue({})

      await service.handleRenewals()

      const subUpdateCall = prisma.subscription.update.mock.calls[0][0]
      expect(subUpdateCall.data.status).toBe('EXPIRED')
      expect(subUpdateCall.data.retryCount).toBe(MAX_RETRY_COUNT)

      const userUpdateCall = prisma.user.update.mock.calls[0][0]
      expect(userUpdateCall.data.isPremium).toBe(false)
      expect(userUpdateCall.data.premiumExpiresAt).toBeNull()
    })

    it('PAST_DUE 재시도 처리: findMany 두 번째 호출로 PAST_DUE 구독 처리', async () => {
      portone.isAvailable.mockReturnValue(true)
      const pastDueSub = makeSub({ id: 'sub-pd', retryCount: 1 })
      // ACTIVE → [], PAST_DUE → [pastDueSub]
      prisma.subscription.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([pastDueSub])
      portone.chargeBillingKey.mockResolvedValue({ status: 'PAID', id: 'p-2' })
      prisma.subscription.update.mockResolvedValue({})
      prisma.payment.create.mockResolvedValue({})
      prisma.user.update.mockResolvedValue({})

      await service.handleRenewals()

      expect(portone.chargeBillingKey).toHaveBeenCalledTimes(1)
      const subUpdateCall = prisma.subscription.update.mock.calls[0][0]
      expect(subUpdateCall.data.status).toBe('ACTIVE')
    })
  })
})
