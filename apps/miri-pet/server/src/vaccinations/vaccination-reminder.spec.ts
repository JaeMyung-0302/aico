import { Logger } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { createFakePrisma, type FakePrisma } from '../../test/helpers/fake-prisma'
import { uniqueViolation } from '../../test/helpers/prisma-errors'
import { type PushNotice, PushService } from '../notifications/push.service'
import { PrismaService } from '../prisma/prisma.service'
import { reminderTargets, VaccinationReminderService } from './vaccination-reminder.service'

const USER_ID = '0199e3a0-0000-7000-8000-0000000000a1'
const PET_ID = '0199e3a0-0000-7000-8000-0000000000b1'
const VAC_1 = '0199e3a0-0000-7000-8000-0000000000c1'
const VAC_2 = '0199e3a0-0000-7000-8000-0000000000c2'

// KST 2026-10-13 10:00 = UTC 01:00
const KST_10_13_AT_10 = new Date('2026-10-13T01:00:00Z')

const candidate = (id: string, type: string, customName: string | null = null) => ({
  id,
  type,
  customName,
  pet: { id: PET_ID, name: '보리', ownerId: USER_ID },
})

describe('reminderTargets', () => {
  it('KST 10-13 실행 → D-7 대상 10-20, D-1 대상 10-14', () => {
    expect(reminderTargets(KST_10_13_AT_10)).toEqual([
      { kind: 'VACCINATION_D7', dueOn: '2026-10-20', daysLeft: 7 },
      { kind: 'VACCINATION_D1', dueOn: '2026-10-14', daysLeft: 1 },
    ])
  })

  it('UTC 기준으로는 전날 밤(10-12T15:00Z)이어도 KST로는 10-13이다', () => {
    expect(reminderTargets(new Date('2026-10-12T15:00:00Z')).map((t) => t.dueOn)).toEqual(['2026-10-20', '2026-10-14'])
  })
})

describe('VaccinationReminderService.runOnce', () => {
  let prisma: FakePrisma
  let sent: PushNotice[][]
  let service: VaccinationReminderService

  beforeEach(async () => {
    prisma = createFakePrisma()
    sent = []
    const push = {
      sendToUsers: jest.fn(async (notices: PushNotice[]) => {
        sent.push(notices)
        return { sent: notices.length }
      }),
    }
    const moduleRef = await Test.createTestingModule({
      providers: [
        VaccinationReminderService,
        { provide: PrismaService, useValue: prisma },
        { provide: PushService, useValue: push },
      ],
    }).compile()
    service = moduleRef.get(VaccinationReminderService)
    prisma.notificationLog.create.mockResolvedValue({})
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined)
  })

  afterEach(() => jest.restoreAllMocks())

  it('D-7·D-1 날짜로 알림 켜짐 + 탈퇴 아님 조건의 접종을 조회한다', async () => {
    prisma.vaccination.findMany.mockResolvedValue([])
    await service.runOnce(KST_10_13_AT_10)

    const wheres = prisma.vaccination.findMany.mock.calls.map(([arg]) => arg.where)
    expect(wheres).toEqual([
      {
        nextDueOn: new Date('2026-10-20T00:00:00Z'),
        pet: { owner: { status: { not: 'DELETED' }, notifyVaccination: true } },
      },
      {
        nextDueOn: new Date('2026-10-14T00:00:00Z'),
        pet: { owner: { status: { not: 'DELETED' }, notifyVaccination: true } },
      },
    ])
  })

  it('로그 insert에 성공한 건만 발송한다 (유니크 충돌 = 이미 보냄)', async () => {
    prisma.vaccination.findMany
      .mockResolvedValueOnce([candidate(VAC_1, 'DHPPL')])
      .mockResolvedValueOnce([candidate(VAC_2, 'ETC', '파보 추가접종')])
    prisma.notificationLog.create.mockResolvedValueOnce({}).mockRejectedValueOnce(uniqueViolation())

    const result = await service.runOnce(KST_10_13_AT_10)

    expect(prisma.notificationLog.create).toHaveBeenNthCalledWith(1, {
      data: { userId: USER_ID, kind: 'VACCINATION_D7', refId: VAC_1, dueOn: new Date('2026-10-20T00:00:00Z') },
    })
    expect(result).toEqual({ today: '2026-10-13', candidates: 2, sent: 1, skipped: 1 })
    expect(sent).toEqual([
      [
        {
          userId: USER_ID,
          title: '접종 7일 전이에요',
          body: '보리 종합백신(DHPPL) 접종일이 10월 20일이에요',
          data: { kind: 'VACCINATION_DUE', vaccinationId: VAC_1, petId: PET_ID },
        },
      ],
    ])
  })

  it('직접 입력(ETC) 접종은 customName으로, D-1은 "내일"로 안내한다', async () => {
    prisma.vaccination.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([candidate(VAC_2, 'ETC', '파보 추가')])
    await service.runOnce(KST_10_13_AT_10)
    expect(sent[0]?.[0]).toMatchObject({ title: '내일 접종일이에요', body: '보리 파보 추가 접종일이 10월 14일이에요' })
  })

  it('대상이 없으면 발송을 호출하지 않는다', async () => {
    prisma.vaccination.findMany.mockResolvedValue([])
    await expect(service.runOnce(KST_10_13_AT_10)).resolves.toEqual({
      today: '2026-10-13',
      candidates: 0,
      sent: 0,
      skipped: 0,
    })
    expect(sent).toEqual([])
  })

  it('로그 insert가 유니크 충돌이 아닌 이유로 실패하면 예외를 그대로 올린다', async () => {
    prisma.vaccination.findMany.mockResolvedValueOnce([candidate(VAC_1, 'RABIES')]).mockResolvedValueOnce([])
    prisma.notificationLog.create.mockRejectedValueOnce(new Error('db down'))
    await expect(service.runOnce(KST_10_13_AT_10)).rejects.toThrow('db down')
  })
})
