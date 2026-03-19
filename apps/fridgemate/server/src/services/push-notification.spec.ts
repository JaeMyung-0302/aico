import { describe, it, expect, vi, beforeEach } from 'vitest'

// vi.mock 팩토리는 hoisted되므로 vi.hoisted로 클래스를 먼저 정의
const { MockWebPushError } = vi.hoisted(() => {
  class MockWebPushError extends Error {
    statusCode: number
    constructor(statusCode: number) {
      super(`Push error ${statusCode}`)
      this.statusCode = statusCode
    }
  }
  return { MockWebPushError }
})

vi.mock('web-push', () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn(),
    WebPushError: MockWebPushError,
  },
}))

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    pushSubscription: {
      findMany: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

vi.mock('../lib/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { sendPushToGroup, sendPushToUser, getVapidPublicKey } from './push-notification.js'
import webpush from 'web-push'
import { prisma } from '../lib/prisma.js'
import { logger } from '../lib/logger.js'

const mockWebpush = webpush as {
  sendNotification: ReturnType<typeof vi.fn>
  WebPushError: typeof MockWebPushError
}
const mockPrisma = prisma as {
  pushSubscription: Record<string, ReturnType<typeof vi.fn>>
}
const mockLogger = logger as Record<string, ReturnType<typeof vi.fn>>

const makeSub = (id: string) => ({
  id,
  endpoint: `https://push.example.com/${id}`,
  p256dh: 'key',
  auth: 'auth',
})

const payload = { title: '테스트', body: '알림 내용' }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('sendPushToGroup', () => {
  it('구독 없으면 sendNotification 호출 안 함', async () => {
    mockPrisma.pushSubscription.findMany.mockResolvedValue([])

    await sendPushToGroup('g-1', payload)

    expect(mockWebpush.sendNotification).not.toHaveBeenCalled()
  })

  it('구독 2개 → sendNotification 각각 호출', async () => {
    mockPrisma.pushSubscription.findMany.mockResolvedValue([
      makeSub('sub-1'),
      makeSub('sub-2'),
    ])
    mockWebpush.sendNotification.mockResolvedValue(undefined)

    await sendPushToGroup('g-1', payload)

    expect(mockWebpush.sendNotification).toHaveBeenCalledTimes(2)
    const [, body] = mockWebpush.sendNotification.mock.calls[0]
    expect(JSON.parse(body as string).title).toBe('테스트')
  })

  it('410 Gone 에러 → 구독 삭제 (throw 없음)', async () => {
    mockPrisma.pushSubscription.findMany.mockResolvedValue([makeSub('sub-1')])
    mockPrisma.pushSubscription.delete.mockResolvedValue({})
    mockWebpush.sendNotification.mockRejectedValue(new MockWebPushError(410))

    await expect(sendPushToGroup('g-1', payload)).resolves.toBeUndefined()

    expect(mockPrisma.pushSubscription.delete).toHaveBeenCalledWith({
      where: { id: 'sub-1' },
    })
  })

  it('404 Not Found 에러 → 구독 삭제 (throw 없음)', async () => {
    mockPrisma.pushSubscription.findMany.mockResolvedValue([makeSub('sub-1')])
    mockPrisma.pushSubscription.delete.mockResolvedValue({})
    mockWebpush.sendNotification.mockRejectedValue(new MockWebPushError(404))

    await expect(sendPushToGroup('g-1', payload)).resolves.toBeUndefined()
    expect(mockPrisma.pushSubscription.delete).toHaveBeenCalled()
  })

  it('일반 에러 → allSettled가 잡고 logger.warn 호출', async () => {
    mockPrisma.pushSubscription.findMany.mockResolvedValue([makeSub('sub-1')])
    mockWebpush.sendNotification.mockRejectedValue(new Error('Network error'))

    await sendPushToGroup('g-1', payload)

    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('1/1 발송 실패'),
    )
  })

  it('2개 중 1개 실패 → warn에 정확한 카운트', async () => {
    mockPrisma.pushSubscription.findMany.mockResolvedValue([
      makeSub('sub-1'),
      makeSub('sub-2'),
    ])
    mockWebpush.sendNotification
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('fail'))

    await sendPushToGroup('g-1', payload)

    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('1/2 발송 실패'),
    )
  })
})

describe('sendPushToUser', () => {
  it('구독 있으면 userId 기준으로 sendNotification 호출', async () => {
    mockPrisma.pushSubscription.findMany.mockResolvedValue([makeSub('sub-u1')])
    mockWebpush.sendNotification.mockResolvedValue(undefined)

    await sendPushToUser('u-1', payload)

    expect(mockWebpush.sendNotification).toHaveBeenCalledTimes(1)
  })
})

describe('getVapidPublicKey', () => {
  it('VAPID_PUBLIC_KEY 환경변수 반환', () => {
    // 모듈 레벨에서 env가 없으면 빈 문자열
    expect(typeof getVapidPublicKey()).toBe('string')
  })
})
