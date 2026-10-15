import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common'
import { type CreateReportRequest, REPORT_HIDE_THRESHOLD } from '@miri-pet/shared'
import { isUniqueViolation } from '../common/prisma/prisma-errors'
import type { Report, ReportTargetType } from '../generated/prisma'
import { PrismaService } from '../prisma/prisma.service'

// 신고 대상 유형별 동작. USER는 Phase 1, POST/COMMENT/MESSAGE는 각 Phase 모듈이 onModuleInit에서 registerHandler 한다
export type ReportTargetHandler = {
  // 대상 작성자(USER면 본인) id. 대상이 없으면(신고자에게 안 보이면) null. reporterId는 선택(기존 핸들러 호환)
  findOwnerId: (targetId: string, reporterId?: string) => Promise<string | null>
  // 새로 숨겼으면 true (이미 숨김·숨기면 안 되는 대상이면 false)
  hide: (targetId: string) => Promise<boolean>
  unhide: (targetId: string) => Promise<void>
  // 대상이 없을 때 404 메시지(같은 대상을 다루는 다른 API와 맞춰 존재 여부를 숨긴다)
  notFoundMessage?: string
}

// 신고 집계 자격: 가입 후 이 기간이 지나야 자동 숨김 집계에 들어간다(새 계정 몰이 신고 방지)
export const REPORTER_MIN_ACCOUNT_AGE_MS = 3 * 24 * 60 * 60 * 1000

// 자동 숨김에 집계할 신고자: ACTIVE + 연령 확인(필수 동의) + 가입 3일 이상
const eligibleReporterWhere = () => ({
  status: 'ACTIVE' as const,
  birthYearVerifiedAt: { not: null },
  createdAt: { lte: new Date(Date.now() - REPORTER_MIN_ACCOUNT_AGE_MS) },
})

export type ResolveAction = 'hide' | 'dismiss'

@Injectable()
export class ReportService {
  private readonly logger = new Logger(ReportService.name)
  private handlers: ReadonlyMap<ReportTargetType, ReportTargetHandler> = new Map()

  constructor(private readonly prisma: PrismaService) {}

  registerHandler(type: ReportTargetType, handler: ReportTargetHandler): void {
    this.handlers = new Map([...this.handlers, [type, handler]])
  }

  private requireHandler(type: ReportTargetType): ReportTargetHandler {
    const handler = this.handlers.get(type)
    if (!handler) throw new UnprocessableEntityException('아직 신고할 수 없는 대상이에요')
    return handler
  }

  async create(reporterId: string, body: CreateReportRequest): Promise<{ id: string }> {
    const handler = this.requireHandler(body.targetType)
    const ownerId = await handler.findOwnerId(body.targetId, reporterId)
    if (!ownerId) throw new NotFoundException(handler.notFoundMessage ?? '신고 대상을 찾을 수 없어요')
    if (ownerId === reporterId) throw new BadRequestException('본인은 신고할 수 없어요')

    const report = await this.prisma.report
      .create({
        data: {
          reporterId,
          targetType: body.targetType,
          targetId: body.targetId,
          reason: body.reason,
          detail: body.detail,
        },
        select: { id: true },
      })
      .catch((error: unknown) => {
        if (isUniqueViolation(error)) throw new ConflictException('이미 신고한 대상이에요')
        throw error
      })

    // 신고자 기준 유니크 → 대기 신고 행 수 = 서로 다른 신고자 수 (자격 있는 신고자만)
    const pendingCount = await this.prisma.report.count({
      where: {
        targetType: body.targetType,
        targetId: body.targetId,
        status: 'PENDING',
        reporter: eligibleReporterWhere(),
      },
    })
    if (pendingCount >= REPORT_HIDE_THRESHOLD && (await handler.hide(body.targetId))) {
      this.logger.warn(`[moderation] auto-hidden ${body.targetType} ${body.targetId}`)
    }
    return report
  }

  listPending(limit: number): Promise<Report[]> {
    return this.prisma.report.findMany({ where: { status: 'PENDING' }, orderBy: { createdAt: 'asc' }, take: limit })
  }

  // 운영자 처리: hide = 숨김 확정, dismiss = 자동 숨김 해제. 같은 대상의 대기 신고를 한꺼번에 닫는다
  async resolve(reportId: string, action: ResolveAction): Promise<{ updated: number }> {
    const report = await this.prisma.report.findUnique({ where: { id: reportId } })
    if (!report) throw new NotFoundException(`신고 ${reportId}를 찾을 수 없습니다`)
    const handler = this.handlers.get(report.targetType)
    if (action === 'hide') await handler?.hide(report.targetId)
    else await handler?.unhide(report.targetId)
    const { count } = await this.prisma.report.updateMany({
      where: { targetType: report.targetType, targetId: report.targetId, status: 'PENDING' },
      data: { status: action === 'hide' ? 'RESOLVED' : 'DISMISSED', resolvedAt: new Date() },
    })
    return { updated: count }
  }
}
