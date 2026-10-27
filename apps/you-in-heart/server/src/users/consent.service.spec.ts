import { Test } from '@nestjs/testing'
import { putConsentsRequestSchema } from '@you-in-heart/shared'
import { createFakePrisma, type FakePrisma } from '../../test/helpers/fake-prisma'
import { PrismaService } from '../prisma/prisma.service'
import { ConsentService, CURRENT_CONSENT_VERSION } from './consent.service'

const USER_ID = '0199e3a0-0000-7000-8000-0000000000a1'

const activeRows = (...kinds: string[]) => kinds.map((kind) => ({ kind }))

describe('ConsentService', () => {
  let prisma: FakePrisma
  let service: ConsentService

  beforeEach(async () => {
    prisma = createFakePrisma()
    const moduleRef = await Test.createTestingModule({
      providers: [ConsentService, { provide: PrismaService, useValue: prisma }],
    }).compile()
    service = moduleRef.get(ConsentService)
    prisma.consent.createMany.mockResolvedValue({ count: 0 })
    prisma.consent.updateMany.mockResolvedValue({ count: 0 })
  })

  describe('요청 계약 (PUT /me/consents)', () => {
    it('TERMS·PRIVACY는 필수(true만), LOCATION은 선택', () => {
      const parse = (body: unknown) => putConsentsRequestSchema.safeParse(body).success
      expect(parse({ terms: true, privacy: true, location: false })).toBe(true)
      expect(parse({ terms: true, privacy: true, location: true })).toBe(true)
      expect(parse({ terms: false, privacy: true, location: true })).toBe(false)
      expect(parse({ terms: true, privacy: false, location: true })).toBe(false)
      expect(parse({ terms: true, location: false })).toBe(false)
    })
  })

  describe('status', () => {
    it('철회되지 않은 동의 행 기준으로 kind별 true/false', async () => {
      prisma.consent.findMany.mockResolvedValue(activeRows('TERMS', 'PRIVACY'))
      await expect(service.status(USER_ID)).resolves.toEqual({ terms: true, privacy: true, location: false })
      expect(prisma.consent.findMany).toHaveBeenCalledWith({
        where: { userId: USER_ID, withdrawnAt: null },
        select: { kind: true },
        distinct: ['kind'],
      })
    })

    it('동의 기록이 없으면 모두 false', async () => {
      prisma.consent.findMany.mockResolvedValue([])
      await expect(service.status(USER_ID)).resolves.toEqual({ terms: false, privacy: false, location: false })
    })
  })

  describe('hasRequiredConsents · hasLocationConsent', () => {
    it.each([
      [['TERMS', 'PRIVACY'], true],
      [['TERMS', 'PRIVACY', 'LOCATION'], true],
      [['TERMS'], false],
      [['PRIVACY', 'LOCATION'], false],
      [[], false],
    ])('필수 동의 %j → %s', async (kinds, expected) => {
      prisma.consent.findMany.mockResolvedValue(activeRows(...kinds))
      await expect(service.hasRequiredConsents(USER_ID)).resolves.toBe(expected)
    })

    it.each([
      [['TERMS', 'PRIVACY', 'LOCATION'], true],
      [['LOCATION'], true],
      [['TERMS', 'PRIVACY'], false],
    ])('위치 동의 %j → %s (철회된 행은 조회에서 빠진다)', async (kinds, expected) => {
      prisma.consent.findMany.mockResolvedValue(activeRows(...kinds))
      await expect(service.hasLocationConsent(USER_ID)).resolves.toBe(expected)
      expect(prisma.consent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: USER_ID, withdrawnAt: null } }),
      )
    })
  })

  describe('put', () => {
    it('처음이면 TERMS·PRIVACY(+LOCATION=true면 LOCATION)를 현재 약관 버전으로 만든다', async () => {
      prisma.consent.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(activeRows('TERMS', 'PRIVACY', 'LOCATION'))

      const result = await service.put(USER_ID, { terms: true, privacy: true, location: true })

      expect(prisma.consent.createMany).toHaveBeenCalledWith({
        data: ['TERMS', 'PRIVACY', 'LOCATION'].map((kind) => ({
          userId: USER_ID,
          kind,
          version: CURRENT_CONSENT_VERSION,
        })),
      })
      expect(prisma.consent.updateMany).not.toHaveBeenCalled()
      expect(prisma.$transaction).toHaveBeenCalledTimes(1)
      expect(result).toEqual({ terms: true, privacy: true, location: true })
    })

    it('이미 동의한 kind는 새 행을 만들지 않는다(멱등)', async () => {
      prisma.consent.findMany
        .mockResolvedValueOnce(activeRows('TERMS', 'PRIVACY'))
        .mockResolvedValueOnce(activeRows('TERMS', 'PRIVACY'))

      await service.put(USER_ID, { terms: true, privacy: true, location: false })

      expect(prisma.consent.createMany).not.toHaveBeenCalled()
    })

    it('LOCATION=false면 유효한 위치 동의에 withdrawnAt을 기록하고 필수 동의는 건드리지 않는다', async () => {
      prisma.consent.findMany
        .mockResolvedValueOnce(activeRows('TERMS', 'PRIVACY', 'LOCATION'))
        .mockResolvedValueOnce(activeRows('TERMS', 'PRIVACY'))

      const result = await service.put(USER_ID, { terms: true, privacy: true, location: false })

      expect(prisma.consent.updateMany).toHaveBeenCalledWith({
        where: { userId: USER_ID, kind: 'LOCATION', withdrawnAt: null },
        data: { withdrawnAt: expect.any(Date) },
      })
      expect(prisma.consent.createMany).not.toHaveBeenCalled()
      expect(result.location).toBe(false)
    })

    it('철회 후 다시 LOCATION=true면 새 행을 만든다(동의 이력 보존)', async () => {
      prisma.consent.findMany
        .mockResolvedValueOnce(activeRows('TERMS', 'PRIVACY'))
        .mockResolvedValueOnce(activeRows('TERMS', 'PRIVACY', 'LOCATION'))

      await service.put(USER_ID, { terms: true, privacy: true, location: true })

      expect(prisma.consent.createMany).toHaveBeenCalledWith({
        data: [{ userId: USER_ID, kind: 'LOCATION', version: CURRENT_CONSENT_VERSION }],
      })
    })
  })
})
