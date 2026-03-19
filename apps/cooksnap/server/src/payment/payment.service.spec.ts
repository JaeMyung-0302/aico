import {
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { PaymentService } from './payment.service'
import { PrismaService } from '../prisma/prisma.service'
import { PortoneService } from '../portone/portone.service'

jest.mock('../common/utils/crypto', () => ({
  encrypt: jest.fn((v: string) => `enc:${v}`),
}))

const makeSubscription = (overrides = {}) => ({
  id: 'sub-1',
  userId: 'user-1',
  billingKey: 'enc:bk-1',
  status: 'ACTIVE' as const,
  currentPeriodEnd: new Date(Date.now() + 30 * 86400_000),
  cancelledAt: null,
  retryCount: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

describe('PaymentService', () => {
  let service: PaymentService
  let prisma: Record<string, jest.Mock> & {
    subscription: Record<string, jest.Mock>
    payment: Record<string, jest.Mock>
    user: Record<string, jest.Mock>
    $transaction: jest.Mock
  }
  let portone: Record<string, jest.Mock>

  beforeEach(async () => {
    const mockPrisma = {
      subscription: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      payment: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      user: { update: jest.fn() },
      $transaction: jest
        .fn()
        .mockImplementation((ops: Promise<unknown>[]) => Promise.all(ops)),
    }

    const mockPortone = {
      isAvailable: jest.fn(),
      chargeBillingKey: jest.fn(),
      getPayment: jest.fn(),
      verifyWebhook: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: PortoneService, useValue: mockPortone },
      ],
    }).compile()

    service = module.get<PaymentService>(PaymentService)
    prisma = module.get(PrismaService) as typeof prisma
    portone = module.get(PortoneService) as typeof portone
  })

  describe('subscribe', () => {
    it('포트원 미설정 시 ServiceUnavailableException', async () => {
      portone.isAvailable.mockReturnValue(false)

      await expect(service.subscribe('user-1', 'bk-1')).rejects.toThrow(
        ServiceUnavailableException,
      )
    })

    it('이미 활성 구독 존재 시 ConflictException', async () => {
      portone.isAvailable.mockReturnValue(true)
      prisma.subscription.findFirst.mockResolvedValue(makeSubscription())

      await expect(service.subscribe('user-1', 'bk-1')).rejects.toThrow(
        ConflictException,
      )
    })

    it('결제 성공 시 success: true + currentPeriodEnd 반환', async () => {
      portone.isAvailable.mockReturnValue(true)
      prisma.subscription.findFirst.mockResolvedValue(null)
      prisma.subscription.create.mockResolvedValue(makeSubscription())
      portone.chargeBillingKey.mockResolvedValue({ status: 'PAID', id: 'p-1' })
      prisma.payment.create.mockResolvedValue({})
      prisma.user.update.mockResolvedValue({})

      const result = await service.subscribe('user-1', 'bk-1')

      expect(result.success).toBe(true)
      expect(result.currentPeriodEnd).toBeInstanceOf(Date)
      expect(prisma.$transaction).toHaveBeenCalledTimes(1)
    })

    it('결제 실패 시 구독 만료 처리 후 ServiceUnavailableException', async () => {
      portone.isAvailable.mockReturnValue(true)
      prisma.subscription.findFirst.mockResolvedValue(null)
      prisma.subscription.create.mockResolvedValue(makeSubscription())
      portone.chargeBillingKey.mockRejectedValue(new Error('결제 거절'))
      prisma.subscription.update.mockResolvedValue({})
      prisma.payment.create.mockResolvedValue({})

      await expect(service.subscribe('user-1', 'bk-1')).rejects.toThrow(
        ServiceUnavailableException,
      )
      expect(prisma.$transaction).toHaveBeenCalledTimes(1)
    })
  })

  describe('cancelSubscription', () => {
    it('활성 구독 없을 시 NotFoundException', async () => {
      prisma.subscription.findFirst.mockResolvedValue(null)

      await expect(service.cancelSubscription('user-1')).rejects.toThrow(
        NotFoundException,
      )
    })

    it('취소 성공 시 cancelledAt + premiumUntil 반환', async () => {
      prisma.subscription.findFirst.mockResolvedValue(makeSubscription())
      prisma.subscription.update.mockResolvedValue({})

      const result = await service.cancelSubscription('user-1')

      expect(result.cancelledAt).toBeInstanceOf(Date)
      expect(result.premiumUntil).toBeInstanceOf(Date)
      expect(prisma.subscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'CANCELLED' }),
        }),
      )
    })
  })

  describe('getStatus', () => {
    it('구독 없을 시 hasSubscription: false', async () => {
      prisma.subscription.findFirst.mockResolvedValue(null)

      const result = await service.getStatus('user-1')

      expect(result.hasSubscription).toBe(false)
      expect(result.status).toBeNull()
      expect(result.currentPeriodEnd).toBeNull()
    })

    it('활성 구독 있을 시 status + ISO 날짜 반환', async () => {
      prisma.subscription.findFirst.mockResolvedValue(makeSubscription())

      const result = await service.getStatus('user-1')

      expect(result.hasSubscription).toBe(true)
      expect(result.status).toBe('ACTIVE')
      expect(typeof result.currentPeriodEnd).toBe('string')
    })
  })
})
