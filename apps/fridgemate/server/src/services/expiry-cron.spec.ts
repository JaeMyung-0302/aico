import { describe, it, expect, vi, beforeEach } from 'vitest'

// cron 콜백을 캡처하기 위한 모킹
const scheduledCallbacks: Array<() => Promise<void>> = []
vi.mock('node-cron', () => ({
  default: {
    schedule: vi.fn((_expr: string, cb: () => Promise<void>) => {
      scheduledCallbacks.push(cb)
    }),
  },
}))

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    foodItem: { findMany: vi.fn() },
    pushSubscription: { count: vi.fn() },
    group: { updateMany: vi.fn() },
  },
}))

vi.mock('./push-notification.js', () => ({
  sendPushToGroup: vi.fn(),
}))

vi.mock('../lib/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

import { startExpiryCron } from './expiry-cron.js'
import { prisma } from '../lib/prisma.js'
import { sendPushToGroup } from './push-notification.js'
import { logger } from '../lib/logger.js'

const mockPrisma = prisma as {
  foodItem: Record<string, ReturnType<typeof vi.fn>>
  pushSubscription: Record<string, ReturnType<typeof vi.fn>>
  group: Record<string, ReturnType<typeof vi.fn>>
}
const mockSendPush = sendPushToGroup as ReturnType<typeof vi.fn>
const mockLogger = logger as Record<string, ReturnType<typeof vi.fn>>

// startExpiryCron 호출 → 콜백 2개 등록
startExpiryCron()

// 등록 순서: [0]=09:00 유통기한, [1]=00:05 프리미엄 만료
const runExpiryCron = scheduledCallbacks[0]
const runPremiumCron = scheduledCallbacks[1]

const makeItem = (
  name: string,
  daysFromNow: number,
  groupId = 'g-1',
) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return {
    name,
    expiryDate: new Date(today.getTime() + daysFromNow * 86400_000),
    compartment: {
      fridge: {
        group: { id: groupId },
      },
    },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('유통기한 알림 cron (09:00)', () => {
  it('만료 임박 식품 없으면 push 발송 안 함', async () => {
    mockPrisma.foodItem.findMany.mockResolvedValue([])

    await runExpiryCron()

    expect(mockSendPush).not.toHaveBeenCalled()
  })

  it('[만료] 레이블: daysFromNow = 0', async () => {
    mockPrisma.foodItem.findMany.mockResolvedValue([makeItem('두부', 0)])
    mockPrisma.pushSubscription.count.mockResolvedValue(1)
    mockSendPush.mockResolvedValue(undefined)

    await runExpiryCron()

    const body: string = mockSendPush.mock.calls[0][1].body
    expect(body).toContain('[만료] 두부')
  })

  it('[D-1] 레이블: daysFromNow = 1', async () => {
    mockPrisma.foodItem.findMany.mockResolvedValue([makeItem('계란', 1)])
    mockPrisma.pushSubscription.count.mockResolvedValue(1)
    mockSendPush.mockResolvedValue(undefined)

    await runExpiryCron()

    const body: string = mockSendPush.mock.calls[0][1].body
    expect(body).toContain('[D-1] 계란')
  })

  it('[D-3] 레이블: daysFromNow = 3', async () => {
    mockPrisma.foodItem.findMany.mockResolvedValue([makeItem('우유', 3)])
    mockPrisma.pushSubscription.count.mockResolvedValue(1)
    mockSendPush.mockResolvedValue(undefined)

    await runExpiryCron()

    const body: string = mockSendPush.mock.calls[0][1].body
    expect(body).toContain('[D-3] 우유')
  })

  it('push 구독 없는 그룹은 발송 skip', async () => {
    mockPrisma.foodItem.findMany.mockResolvedValue([makeItem('두부', 1)])
    mockPrisma.pushSubscription.count.mockResolvedValue(0)

    await runExpiryCron()

    expect(mockSendPush).not.toHaveBeenCalled()
  })

  it('4개 이상 아이템 → "외 N개" suffix', async () => {
    mockPrisma.foodItem.findMany.mockResolvedValue([
      makeItem('A', 1),
      makeItem('B', 1),
      makeItem('C', 1),
      makeItem('D', 1),
    ])
    mockPrisma.pushSubscription.count.mockResolvedValue(1)
    mockSendPush.mockResolvedValue(undefined)

    await runExpiryCron()

    const body: string = mockSendPush.mock.calls[0][1].body
    expect(body).toContain('외 1개')
  })

  it('서로 다른 그룹 → 각 그룹에 별도 push', async () => {
    mockPrisma.foodItem.findMany.mockResolvedValue([
      makeItem('두부', 1, 'g-1'),
      makeItem('계란', 1, 'g-2'),
    ])
    mockPrisma.pushSubscription.count.mockResolvedValue(1)
    mockSendPush.mockResolvedValue(undefined)

    await runExpiryCron()

    expect(mockSendPush).toHaveBeenCalledTimes(2)
  })

  it('DB 에러 시 logger.error 호출 (throw 없음)', async () => {
    mockPrisma.foodItem.findMany.mockRejectedValue(new Error('DB down'))

    await expect(runExpiryCron()).resolves.toBeUndefined()
    expect(mockLogger.error).toHaveBeenCalled()
  })
})

describe('프리미엄 만료 cron (00:05)', () => {
  it('만료된 그룹 있으면 updateMany 호출 + logger.info', async () => {
    mockPrisma.group.updateMany.mockResolvedValue({ count: 3 })

    await runPremiumCron()

    expect(mockPrisma.group.updateMany).toHaveBeenCalledWith({
      where: { isPremium: true, premiumExpiresAt: { lt: expect.any(Date) } },
      data: { isPremium: false },
    })
    expect(mockLogger.info).toHaveBeenCalled()
  })

  it('만료 그룹 없으면 logger.info 호출 안 함', async () => {
    mockPrisma.group.updateMany.mockResolvedValue({ count: 0 })

    await runPremiumCron()

    expect(mockLogger.info).not.toHaveBeenCalled()
  })

  it('에러 시 logger.error 호출', async () => {
    mockPrisma.group.updateMany.mockRejectedValue(new Error('DB error'))

    await expect(runPremiumCron()).resolves.toBeUndefined()
    expect(mockLogger.error).toHaveBeenCalled()
  })
})
