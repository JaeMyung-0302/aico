import {
  BadRequestException,
  ConflictException,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { createFakePrisma, type FakePrisma } from '../../test/helpers/fake-prisma'
import { uniqueViolation } from '../../test/helpers/prisma-errors'
import { PrismaService } from '../prisma/prisma.service'
import { REPORTER_MIN_ACCOUNT_AGE_MS, type ReportTargetHandler, ReportService } from './report.service'

const REPORTER = '0199e3a0-0000-7000-8000-0000000000a1'
const TARGET = '0199e3a0-0000-7000-8000-0000000000b1'
const AUTHOR = '0199e3a0-0000-7000-8000-0000000000c1'

const makeHandler = (ownerId: string | null = AUTHOR): jest.Mocked<ReportTargetHandler> => ({
  findOwnerId: jest.fn().mockResolvedValue(ownerId),
  hide: jest.fn().mockResolvedValue(true),
  unhide: jest.fn().mockResolvedValue(undefined),
})

const body = { targetType: 'POST' as const, targetId: TARGET, reason: 'SPAM' as const }

describe('ReportService', () => {
  let prisma: FakePrisma
  let service: ReportService
  let postHandler: jest.Mocked<ReportTargetHandler>

  beforeEach(async () => {
    prisma = createFakePrisma()
    const moduleRef = await Test.createTestingModule({
      providers: [ReportService, { provide: PrismaService, useValue: prisma }],
    }).compile()
    service = moduleRef.get(ReportService)
    postHandler = makeHandler()
    service.registerHandler('POST', postHandler)
    prisma.report.create.mockResolvedValue({ id: 'report-1' })
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('create', () => {
    it('신고를 저장하고 id를 돌려준다', async () => {
      prisma.report.count.mockResolvedValue(1)
      await expect(service.create(REPORTER, { ...body, detail: '광고' })).resolves.toEqual({ id: 'report-1' })
      expect(prisma.report.create).toHaveBeenCalledWith({
        data: { reporterId: REPORTER, targetType: 'POST', targetId: TARGET, reason: 'SPAM', detail: '광고' },
        select: { id: true },
      })
    })

    it('대상 소유자를 찾을 때 신고자 id도 넘긴다(대화 멤버만 신고할 수 있는 MESSAGE용)', async () => {
      prisma.report.count.mockResolvedValue(1)
      await service.create(REPORTER, body)
      expect(postHandler.findOwnerId).toHaveBeenCalledWith(TARGET, REPORTER)
    })

    it('서로 다른 신고자 2명까지는 노출을 유지한다', async () => {
      prisma.report.count.mockResolvedValue(2)
      await service.create(REPORTER, body)
      expect(postHandler.hide).not.toHaveBeenCalled()
    })

    it('서로 다른 "자격 있는" 신고자가 3명이 되면 대상을 숨긴다(ACTIVE·연령 확인·가입 3일 이상만 집계)', async () => {
      prisma.report.count.mockResolvedValue(3)
      const before = Date.now()
      await service.create(REPORTER, body)
      expect(REPORTER_MIN_ACCOUNT_AGE_MS).toBe(3 * 24 * 60 * 60 * 1000)
      expect(prisma.report.count).toHaveBeenCalledWith({
        where: {
          targetType: 'POST',
          targetId: TARGET,
          status: 'PENDING',
          reporter: { status: 'ACTIVE', birthYearVerifiedAt: { not: null }, createdAt: { lte: expect.any(Date) } },
        },
      })
      const cutoff: Date = prisma.report.count.mock.calls[0][0].where.reporter.createdAt.lte
      expect(cutoff.getTime()).toBeGreaterThanOrEqual(before - REPORTER_MIN_ACCOUNT_AGE_MS)
      expect(cutoff.getTime()).toBeLessThanOrEqual(Date.now() - REPORTER_MIN_ACCOUNT_AGE_MS)
      expect(postHandler.hide).toHaveBeenCalledWith(TARGET)
    })

    it('자동 숨김이 일어나면 운영자용 경고 로그 한 줄을 남긴다', async () => {
      prisma.report.count.mockResolvedValue(3)
      await service.create(REPORTER, body)
      expect(Logger.prototype.warn).toHaveBeenCalledWith(`[moderation] auto-hidden POST ${TARGET}`)
    })

    it('핸들러가 숨기지 않았으면(이미 숨김·ADMIN 등) 로그를 남기지 않는다', async () => {
      prisma.report.count.mockResolvedValue(4)
      postHandler.hide.mockResolvedValue(false)
      await service.create(REPORTER, body)
      expect(postHandler.hide).toHaveBeenCalledWith(TARGET)
      expect(Logger.prototype.warn).not.toHaveBeenCalled()
    })

    it('같은 신고자가 같은 대상을 두 번 신고하면 409', async () => {
      prisma.report.create.mockRejectedValue(uniqueViolation('reporterId_targetType_targetId'))
      await expect(service.create(REPORTER, body)).rejects.toBeInstanceOf(ConflictException)
      expect(postHandler.hide).not.toHaveBeenCalled()
    })

    it('유니크 위반 외 DB 에러는 그대로 던진다', async () => {
      prisma.report.create.mockRejectedValue(new Error('db down'))
      await expect(service.create(REPORTER, body)).rejects.toThrow('db down')
    })

    it('핸들러가 아직 등록되지 않은 대상 유형은 422', async () => {
      await expect(service.create(REPORTER, { ...body, targetType: 'MESSAGE' })).rejects.toBeInstanceOf(
        UnprocessableEntityException,
      )
    })

    it('대상이 없으면 404', async () => {
      service.registerHandler('POST', makeHandler(null))
      await expect(service.create(REPORTER, body)).rejects.toBeInstanceOf(NotFoundException)
    })

    it('자기 콘텐츠·자기 자신은 신고할 수 없다(400)', async () => {
      service.registerHandler('POST', makeHandler(REPORTER))
      await expect(service.create(REPORTER, body)).rejects.toBeInstanceOf(BadRequestException)
    })
  })

  describe('resolve (운영자)', () => {
    beforeEach(() => {
      prisma.report.findUnique.mockResolvedValue({ id: 'report-1', targetType: 'POST', targetId: TARGET })
      prisma.report.updateMany.mockResolvedValue({ count: 3 })
    })

    it('hide: 대상을 숨기고 그 대상의 대기 신고를 모두 RESOLVED로', async () => {
      await expect(service.resolve('report-1', 'hide')).resolves.toEqual({ updated: 3 })
      expect(postHandler.hide).toHaveBeenCalledWith(TARGET)
      expect(prisma.report.updateMany).toHaveBeenCalledWith({
        where: { targetType: 'POST', targetId: TARGET, status: 'PENDING' },
        data: { status: 'RESOLVED', resolvedAt: expect.any(Date) },
      })
    })

    it('dismiss: 자동 숨김을 풀고 대기 신고를 DISMISSED로', async () => {
      await service.resolve('report-1', 'dismiss')
      expect(postHandler.unhide).toHaveBeenCalledWith(TARGET)
      expect(prisma.report.updateMany).toHaveBeenCalledWith({
        where: { targetType: 'POST', targetId: TARGET, status: 'PENDING' },
        data: { status: 'DISMISSED', resolvedAt: expect.any(Date) },
      })
    })

    it('없는 신고는 404', async () => {
      prisma.report.findUnique.mockResolvedValue(null)
      await expect(service.resolve('nope', 'hide')).rejects.toBeInstanceOf(NotFoundException)
    })

    it('핸들러 없는 유형도 상태 변경은 한다', async () => {
      prisma.report.findUnique.mockResolvedValue({ id: 'r', targetType: 'COMMENT', targetId: TARGET })
      await expect(service.resolve('r', 'dismiss')).resolves.toEqual({ updated: 3 })
    })
  })

  it('listPending은 오래된 대기 신고부터 돌려준다', async () => {
    prisma.report.findMany.mockResolvedValue([{ id: 'r1' }])
    await expect(service.listPending(10)).resolves.toEqual([{ id: 'r1' }])
    expect(prisma.report.findMany).toHaveBeenCalledWith({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      take: 10,
    })
  })
})
