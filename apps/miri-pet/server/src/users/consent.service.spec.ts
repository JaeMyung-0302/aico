import { BadRequestException, UnprocessableEntityException } from '@nestjs/common'
import { CONSENT_REQUIRED_KIND_CODE, CURRENT_CONSENT_VERSION } from '@miri-pet/shared'
import { Test } from '@nestjs/testing'
import { createFakePrisma, type FakePrisma } from '../../test/helpers/fake-prisma'
import { PrismaService } from '../prisma/prisma.service'
import { ConsentService } from './consent.service'

const USER_ID = '0199e3a0-0000-7000-8000-0000000000a1'
const ALL_FOUR = [
  { kind: 'TERMS' as const, version: '2026-10' },
  { kind: 'PRIVACY' as const, version: '2026-10' },
  { kind: 'LOCATION' as const, version: '2026-10' },
  { kind: 'CERTIFICATE' as const, version: '2026-10' },
]

describe('ConsentService', () => {
  let prisma: FakePrisma
  let service: ConsentService

  beforeEach(async () => {
    prisma = createFakePrisma()
    const moduleRef = await Test.createTestingModule({
      providers: [ConsentService, { provide: PrismaService, useValue: prisma }],
    }).compile()
    service = moduleRef.get(ConsentService)
    prisma.consent.createMany.mockResolvedValue({ count: 4 })
    prisma.user.update.mockResolvedValue({})
  })

  it('만 14세 미만이면 422이고 아무것도 저장하지 않는다', async () => {
    await expect(service.submit(USER_ID, { isAge14OrOlder: false, consents: ALL_FOUR })).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    )
    expect(prisma.consent.createMany).not.toHaveBeenCalled()
  })

  it('필수 동의(TERMS·PRIVACY) 중 하나라도 빠지면 422', async () => {
    const consents = ALL_FOUR.filter((c) => c.kind !== 'PRIVACY')
    await expect(service.submit(USER_ID, { isAge14OrOlder: true, consents })).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    )
  })

  it('동의 4종을 버전과 함께 저장하고 연령 확인 시각을 남긴다', async () => {
    await service.submit(USER_ID, { isAge14OrOlder: true, consents: ALL_FOUR })
    expect(prisma.consent.createMany).toHaveBeenCalledWith({
      data: ALL_FOUR.map((c) => ({ userId: USER_ID, kind: c.kind, version: c.version })),
    })
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: USER_ID },
      data: { birthYearVerifiedAt: expect.any(Date) },
    })
    expect(prisma.$transaction).toHaveBeenCalledTimes(1)
  })

  it('같은 kind가 중복되면 마지막 값 하나만 저장한다', async () => {
    const consents = [...ALL_FOUR, { kind: 'TERMS' as const, version: '2026-11' }]
    await service.submit(USER_ID, { isAge14OrOlder: true, consents })
    const data = prisma.consent.createMany.mock.calls[0][0].data
    expect(data).toHaveLength(4)
    expect(data).toContainEqual({ userId: USER_ID, kind: 'TERMS', version: '2026-11' })
  })

  it('위치 동의는 선택이라 빠져도 저장한다', async () => {
    const consents = ALL_FOUR.filter((c) => c.kind !== 'LOCATION')
    await service.submit(USER_ID, { isAge14OrOlder: true, consents })
    expect(prisma.consent.createMany).toHaveBeenCalledTimes(1)
  })

  describe('hasRequiredConsents', () => {
    it('철회되지 않은 필수 동의 2종이 모두 있으면 true', async () => {
      prisma.consent.findMany.mockResolvedValue([{ kind: 'TERMS' }, { kind: 'PRIVACY' }])
      await expect(service.hasRequiredConsents(USER_ID)).resolves.toBe(true)
      expect(prisma.consent.findMany).toHaveBeenCalledWith({
        where: { userId: USER_ID, kind: { in: ['TERMS', 'PRIVACY'] }, withdrawnAt: null },
        select: { kind: true },
        distinct: ['kind'],
      })
    })

    it('하나라도 없으면 false', async () => {
      prisma.consent.findMany.mockResolvedValue([{ kind: 'TERMS' }])
      await expect(service.hasRequiredConsents(USER_ID)).resolves.toBe(false)
    })
  })
  describe('list (GET /me/consents)', () => {
    it('kind별 가장 최근 행을 kind 순서대로 ISO 날짜로 돌려준다', async () => {
      const agreedAt = new Date('2026-10-01T00:00:00.000Z')
      const withdrawnAt = new Date('2026-10-05T00:00:00.000Z')
      prisma.consent.findMany.mockResolvedValue([
        { kind: 'MARKETING', version: 'v1', agreedAt, withdrawnAt },
        { kind: 'TERMS', version: 'v1', agreedAt, withdrawnAt: null },
      ])
      await expect(service.list(USER_ID)).resolves.toEqual([
        { kind: 'TERMS', version: 'v1', agreedAt: agreedAt.toISOString(), withdrawnAt: null },
        { kind: 'MARKETING', version: 'v1', agreedAt: agreedAt.toISOString(), withdrawnAt: withdrawnAt.toISOString() },
      ])
      expect(prisma.consent.findMany).toHaveBeenCalledWith({
        where: { userId: USER_ID },
        orderBy: [{ agreedAt: 'desc' }, { id: 'desc' }],
        distinct: ['kind'],
        select: { kind: true, version: true, agreedAt: true, withdrawnAt: true },
      })
    })

    it('동의 기록이 없으면 빈 배열', async () => {
      prisma.consent.findMany.mockResolvedValue([])
      await expect(service.list(USER_ID)).resolves.toEqual([])
    })
  })

  describe('update (PATCH /me/consents/:kind)', () => {
    beforeEach(() => {
      prisma.consent.findMany.mockResolvedValue([])
    })

    it.each(['TERMS', 'PRIVACY'] as const)('필수 동의 %s는 400 CONSENT_REQUIRED_KIND이고 아무것도 바꾸지 않는다', async (kind) => {
      const error = await service.update(USER_ID, kind, false).catch((caught: unknown) => caught)
      expect(error).toBeInstanceOf(BadRequestException)
      expect(error instanceof BadRequestException && error.getResponse()).toMatchObject({
        code: CONSENT_REQUIRED_KIND_CODE,
      })
      expect(prisma.consent.updateMany).not.toHaveBeenCalled()
      expect(prisma.consent.create).not.toHaveBeenCalled()
    })

    it('CERTIFICATE는 전용 엔드포인트를 쓰도록 400', async () => {
      await expect(service.update(USER_ID, 'CERTIFICATE', true)).rejects.toBeInstanceOf(BadRequestException)
      expect(prisma.consent.create).not.toHaveBeenCalled()
    })

    it('선택 동의 동의 → 유효한 행이 없으면 현재 버전으로 새 행을 만들고 목록을 돌려준다', async () => {
      prisma.consent.findFirst.mockResolvedValue(null)
      prisma.consent.create.mockResolvedValue({})
      await expect(service.update(USER_ID, 'LOCATION', true)).resolves.toEqual([])
      expect(prisma.consent.findFirst).toHaveBeenCalledWith({
        where: { userId: USER_ID, kind: 'LOCATION', withdrawnAt: null },
        select: { id: true },
      })
      expect(prisma.consent.create).toHaveBeenCalledWith({
        data: { userId: USER_ID, kind: 'LOCATION', version: CURRENT_CONSENT_VERSION },
      })
    })

    it('이미 동의 중이면 새 행을 만들지 않는다(멱등)', async () => {
      prisma.consent.findFirst.mockResolvedValue({ id: 'c1' })
      await service.update(USER_ID, 'MARKETING', true)
      expect(prisma.consent.create).not.toHaveBeenCalled()
    })

    it('철회 → 유효한 행에 withdrawnAt을 기록한다', async () => {
      prisma.consent.updateMany.mockResolvedValue({ count: 1 })
      await service.update(USER_ID, 'MARKETING', false)
      expect(prisma.consent.updateMany).toHaveBeenCalledWith({
        where: { userId: USER_ID, kind: 'MARKETING', withdrawnAt: null },
        data: { withdrawnAt: expect.any(Date) },
      })
      expect(prisma.consent.create).not.toHaveBeenCalled()
    })
  })
})
