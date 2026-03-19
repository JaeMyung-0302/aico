import { describe, it, expect, vi, beforeEach } from 'vitest'

// 모듈 모킹 (hoisted)
vi.mock('../lib/prisma.js', () => ({
  prisma: {
    subscription: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    payment: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    group: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
  },
}))

vi.mock('../lib/crypto.js', () => ({
  encrypt: vi.fn((v: string) => `enc:${v}`),
}))

vi.mock('../lib/portone.js', () => ({
  isAvailable: vi.fn(),
  chargeBillingKey: vi.fn(),
  verifyWebhook: vi.fn(),
  getPayment: vi.fn(),
}))

import { subscribe, cancelSubscription, getStatus } from './payment.js'
import { prisma } from '../lib/prisma.js'
import * as portone from '../lib/portone.js'

const mockPrisma = prisma as {
  subscription: Record<string, ReturnType<typeof vi.fn>>
  payment: Record<string, ReturnType<typeof vi.fn>>
  group: Record<string, ReturnType<typeof vi.fn>>
  $transaction: ReturnType<typeof vi.fn>
}
const mockPortone = portone as Record<string, ReturnType<typeof vi.fn>>

beforeEach(() => {
  vi.clearAllMocks()
})

describe('subscribe', () => {
  it('포트원 미설정 시 에러', async () => {
    mockPortone.isAvailable.mockReturnValue(false)

    await expect(subscribe('g-1', 'u-1', 'bk-1')).rejects.toThrow(
      '결제 서비스',
    )
  })

  it('이미 ACTIVE 구독이 있으면 에러', async () => {
    mockPortone.isAvailable.mockReturnValue(true)
    mockPrisma.subscription.findFirst.mockResolvedValue({ id: 'sub-existing' })

    await expect(subscribe('g-1', 'u-1', 'bk-1')).rejects.toThrow(
      '이미 활성 구독',
    )
  })

  it('결제 실패 시 FAILED 결제 기록 + 에러', async () => {
    mockPortone.isAvailable.mockReturnValue(true)
    mockPrisma.subscription.findFirst.mockResolvedValue(null)
    mockPortone.chargeBillingKey.mockRejectedValue(new Error('카드 한도 초과'))
    mockPrisma.payment.create.mockResolvedValue({})

    await expect(subscribe('g-1', 'u-1', 'bk-1')).rejects.toThrow(
      '결제에 실패',
    )

    const paymentCreateCall = mockPrisma.payment.create.mock.calls[0][0]
    expect(paymentCreateCall.data.status).toBe('FAILED')
    expect(paymentCreateCall.data.failReason).toBe('카드 한도 초과')
  })

  it('결제 성공: subscription + payment PAID + group isPremium', async () => {
    mockPortone.isAvailable.mockReturnValue(true)
    mockPrisma.subscription.findFirst.mockResolvedValue(null)
    mockPortone.chargeBillingKey.mockResolvedValue({ status: 'PAID' })
    mockPrisma.subscription.create.mockResolvedValue({})
    mockPrisma.payment.create.mockResolvedValue({})
    mockPrisma.group.update.mockResolvedValue({})

    const result = await subscribe('g-1', 'u-1', 'bk-1')

    expect(result.success).toBe(true)
    expect(result.currentPeriodEnd).toBeInstanceOf(Date)

    // $transaction에 3개 연산 전달
    const txOps = mockPrisma.$transaction.mock.calls[0][0] as unknown[]
    expect(txOps).toHaveLength(3)

    const subCreateCall = mockPrisma.subscription.create.mock.calls[0][0]
    expect(subCreateCall.data.status).toBe('ACTIVE')
    expect(subCreateCall.data.billingKey).toBe('enc:bk-1') // encrypted

    const paymentCreateCall = mockPrisma.payment.create.mock.calls[0][0]
    expect(paymentCreateCall.data.status).toBe('PAID')
    expect(paymentCreateCall.data.amount).toBe(2900)

    const groupUpdateCall = mockPrisma.group.update.mock.calls[0][0]
    expect(groupUpdateCall.data.isPremium).toBe(true)
  })
})

describe('cancelSubscription', () => {
  it('활성 구독 없으면 에러', async () => {
    mockPrisma.subscription.findFirst.mockResolvedValue(null)

    await expect(cancelSubscription('g-1')).rejects.toThrow('활성 구독이 없습니다')
  })

  it('취소 성공: CANCELLED + premiumUntil 반환', async () => {
    const periodEnd = new Date(Date.now() + 86400_000 * 15)
    mockPrisma.subscription.findFirst.mockResolvedValue({
      id: 'sub-1',
      currentPeriodEnd: periodEnd,
    })
    mockPrisma.subscription.update.mockResolvedValue({})

    const result = await cancelSubscription('g-1')

    expect(result.premiumUntil).toBe(periodEnd)
    const updateCall = mockPrisma.subscription.update.mock.calls[0][0]
    expect(updateCall.data.status).toBe('CANCELLED')
  })
})

describe('getStatus', () => {
  it('구독 없음 → hasSubscription: false', async () => {
    mockPrisma.subscription.findFirst.mockResolvedValue(null)
    mockPrisma.group.findUnique.mockResolvedValue({ isPremium: false })

    const result = await getStatus('g-1')

    expect(result.hasSubscription).toBe(false)
    expect(result.status).toBeNull()
  })

  it('ACTIVE 구독 → hasSubscription: true + currentPeriodEnd ISO string', async () => {
    const periodEnd = new Date()
    mockPrisma.subscription.findFirst.mockResolvedValue({
      id: 'sub-1',
      status: 'ACTIVE',
      currentPeriodEnd: periodEnd,
    })
    mockPrisma.group.findUnique.mockResolvedValue({ isPremium: true })

    const result = await getStatus('g-1')

    expect(result.hasSubscription).toBe(true)
    expect(result.status).toBe('ACTIVE')
    expect(result.currentPeriodEnd).toBe(periodEnd.toISOString())
    expect(result.isPremium).toBe(true)
  })
})
