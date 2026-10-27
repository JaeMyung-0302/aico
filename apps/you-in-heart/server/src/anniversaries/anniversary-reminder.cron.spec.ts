import { Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Test } from '@nestjs/testing'
import { uniqueViolation } from '../../test/helpers/prisma-errors'
import { EventsService } from '../events/events.service'
import { CoupleNotifier } from '../notifications/couple-notifier'
import { PushService } from '../notifications/push.service'
import { PrismaService } from '../prisma/prisma.service'
import { AnniversaryReminderCron, shouldCatchUpOnBoot } from './anniversary-reminder.cron'
import { AnniversaryReminderService } from './anniversary-reminder.service'

type FakeCouple = {
  id: string
  status: 'ACTIVE' | 'UNLINKING'
  startedOn: Date | null
  anniversaries: { id: string; title: string; date: Date }[]
  members: { userId: string }[]
}

type LogKey = { kind: string; coupleId: string; refKey: string; dueOn: Date }

const couple = (id: string, startedOn: string | null, overrides: Partial<FakeCouple> = {}): FakeCouple => ({
  id,
  status: 'ACTIVE',
  startedOn: startedOn ? new Date(`${startedOn}T00:00:00Z`) : null,
  anniversaries: [],
  members: [{ userId: `${id}-u1` }, { userId: `${id}-u2` }],
  ...overrides,
})

// couple.findMany(status·id 커서 필터) + notificationLog.create(유니크 키 중복이면 P2002)만 흉내 낸다
const createFakePrisma = (couples: readonly FakeCouple[]) => {
  let logs: readonly string[] = []
  const keyOf = ({ kind, coupleId, refKey, dueOn }: LogKey) => `${kind}|${coupleId}|${refKey}|${dueOn.toISOString()}`
  return {
    couple: {
      findMany: jest.fn(async ({ where, take }: { where: { status: string; id?: { gt: string } }; take: number }) =>
        couples
          .filter((row) => row.status === where.status && (!where.id || row.id > where.id.gt))
          .sort((a, b) => a.id.localeCompare(b.id))
          .slice(0, take),
      ),
    },
    notificationLog: {
      create: jest.fn(async ({ data }: { data: LogKey }) => {
        const key = keyOf(data)
        if (logs.includes(key)) throw uniqueViolation('kind_coupleId_refKey_dueOn')
        logs = [...logs, key]
        return data
      }),
    },
    logCount: () => logs.length,
  }
}

const setup = async (couples: readonly FakeCouple[]) => {
  const prisma = createFakePrisma(couples)
  const sendToUsers = jest.fn(async (notices: readonly unknown[]) => ({ sent: notices.length }))
  const record = jest.fn(async () => undefined)
  const moduleRef = await Test.createTestingModule({
    providers: [
      AnniversaryReminderCron,
      AnniversaryReminderService,
      CoupleNotifier,
      { provide: PrismaService, useValue: prisma },
      { provide: PushService, useValue: { sendToUsers } },
      { provide: EventsService, useValue: { record } },
      { provide: ConfigService, useValue: new ConfigService({ nodeEnv: 'test' }) },
    ],
  }).compile()
  return { cron: moduleRef.get(AnniversaryReminderCron), prisma, sendToUsers, record }
}

type SentNotice = { userId: string; title: string; body: string; data?: Record<string, string> }
const sentNotices = (sendToUsers: jest.Mock): SentNotice[] => sendToUsers.mock.calls.flatMap(([notices]) => notices)

// 2025-06-05 09:00 KST
const NINE_AM_KST = new Date('2025-06-05T00:00:00Z')

describe('AnniversaryReminderCron (fake clock)', () => {
  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  it('09:00 KST에 D-0·D-3 대상 커플의 멤버 2명에게 각 1건씩 보내고 발송마다 notification_sent 1건', async () => {
    jest.useFakeTimers({ now: NINE_AM_KST, doNotFake: ['nextTick', 'setImmediate'] })
    const couples = [
      // 2025-03-01 시작 → 100일 = 2025-06-08 (D-3)
      couple('c-d3', '2025-03-01'),
      // 2024-06-05 시작 → 1주년 = 2025-06-05 (D-0)
      couple('c-d0', '2024-06-05'),
      // 커스텀 기념일이 오늘(D-0)
      couple('c-custom', null, { anniversaries: [{ id: 'a-1', title: '첫 여행', date: new Date('2024-06-05') }] }),
      couple('c-none', '2025-05-20'),
    ]
    const { cron, sendToUsers, record } = await setup(couples)
    await cron.handle()

    const notices = sentNotices(sendToUsers)
    expect(notices.map((notice) => notice.userId).sort()).toEqual(
      ['c-custom-u1', 'c-custom-u2', 'c-d0-u1', 'c-d0-u2', 'c-d3-u1', 'c-d3-u2'].sort(),
    )
    expect(notices.filter((notice) => notice.data?.type === 'ANNIVERSARY_D3').map((n) => n.userId)).toEqual([
      'c-d3-u1',
      'c-d3-u2',
    ])
    expect(record).toHaveBeenCalledTimes(6)
    expect(record).toHaveBeenCalledWith('c-d3', 'c-d3-u1', 'notification_sent', { kind: 'ANNIVERSARY_D3' })
  })

  it('잠금 화면 노출: 제목·본문에 날짜·커스텀 제목이 없고 data는 type과 id만', async () => {
    jest.useFakeTimers({ now: NINE_AM_KST, doNotFake: ['nextTick', 'setImmediate'] })
    const { cron, sendToUsers } = await setup([
      couple('c-custom', null, { anniversaries: [{ id: 'a-1', title: '첫 여행', date: new Date('2024-06-05') }] }),
    ])
    await cron.handle()
    const notices = sentNotices(sendToUsers)
    expect(notices).toHaveLength(2)
    notices.forEach((notice) => {
      const text = `${notice.title} ${notice.body}`
      expect(text).not.toMatch(/\d{4}|\d+월|첫 여행/)
      expect(Object.keys(notice.data ?? {}).sort()).toEqual(['anniversaryId', 'type'])
    })
  })

  it('같은 날 두 번 실행해도 NotificationLog 유니크로 추가 발송 0건', async () => {
    jest.useFakeTimers({ now: NINE_AM_KST, doNotFake: ['nextTick', 'setImmediate'] })
    const { cron, prisma, sendToUsers, record } = await setup([couple('c-d3', '2025-03-01')])
    await cron.handle()
    jest.setSystemTime(new Date('2025-06-05T06:00:00Z'))
    await cron.handle()
    expect(sentNotices(sendToUsers)).toHaveLength(2)
    expect(prisma.logCount()).toBe(2)
    expect(record).toHaveBeenCalledTimes(2)
  })

  it('UNLINKING 커플은 제외', async () => {
    jest.useFakeTimers({ now: NINE_AM_KST, doNotFake: ['nextTick', 'setImmediate'] })
    const { cron, sendToUsers } = await setup([couple('c-d3', '2025-03-01', { status: 'UNLINKING' })])
    await cron.handle()
    expect(sentNotices(sendToUsers)).toHaveLength(0)
  })

  it('실행 실패는 로그만 남기고 크론을 죽이지 않는다', async () => {
    const { cron, prisma } = await setup([])
    prisma.couple.findMany.mockRejectedValueOnce(new Error('db down'))
    const error = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined)
    await expect(cron.handle()).resolves.toBeUndefined()
    expect(error).toHaveBeenCalled()
  })

  it('NODE_ENV=test 앱은 부팅 시 실행하지 않는다', async () => {
    const { cron, sendToUsers } = await setup([couple('c-d3', '2025-03-01')])
    const handle = jest.spyOn(cron, 'handle')
    cron.onApplicationBootstrap()
    expect(handle).not.toHaveBeenCalled()
    expect(sendToUsers).not.toHaveBeenCalled()
  })
})

describe('shouldCatchUpOnBoot', () => {
  it('KST 09시 이후 부팅이면 당일분을 1회 실행한다', () => {
    expect(shouldCatchUpOnBoot(new Date('2025-06-05T00:00:00Z'), 'production')).toBe(true)
    expect(shouldCatchUpOnBoot(new Date('2025-06-05T14:59:00Z'), 'development')).toBe(true)
  })

  it('KST 09시 이전 부팅이면 크론에 맡긴다', () => {
    expect(shouldCatchUpOnBoot(new Date('2025-06-04T23:59:00Z'), 'production')).toBe(false)
    // UTC 15:00 = KST 다음 날 0시
    expect(shouldCatchUpOnBoot(new Date('2025-06-05T15:00:00Z'), 'production')).toBe(false)
  })

  it('테스트 환경이거나 REMINDER_BOOT_CATCHUP=false면 하지 않는다', () => {
    expect(shouldCatchUpOnBoot(new Date('2025-06-05T05:00:00Z'), 'test')).toBe(false)
    expect(shouldCatchUpOnBoot(new Date('2025-06-05T05:00:00Z'), 'production', 'false')).toBe(false)
  })
})
