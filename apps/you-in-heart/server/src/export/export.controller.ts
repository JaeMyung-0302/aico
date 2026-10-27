import { Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common'
import { type ExportJob, idSchema, type LatestExportResponse } from '@you-in-heart/shared'
import { Authenticated } from '../auth/decorators/authenticated.decorator'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import type { AuthUser } from '../auth/guards/jwt-auth.guard'
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe'
import { UserThrottle } from '../common/throttle/user-throttle.guard'
import { AllowDuringUnlinking } from '../couples/decorators/allow-during-unlinking.decorator'
import { type CoupleContext, CurrentCouple } from '../couples/decorators/current-couple.decorator'
import { ExportService } from './export.service'

const idPipe = new ZodValidationPipe(idSchema)

// 내보내기는 전체 기록을 zip으로 묶는 무거운 작업 → 사용자당 3회/시간. 넘으면 429 RATE_LIMITED
const EXPORT_REQUEST_THROTTLE = { name: 'export-request', ttl: 3_600_000, limit: 3 }

// 연결 해제 유예(UNLINKING) 중에도 내보내기는 허용한다(해제 후 30일 동안 기록을 가져갈 수 있게)
@Controller('export')
@Authenticated()
export class ExportController {
  constructor(private readonly exports: ExportService) {}

  // 처리는 백그라운드 → 202. 진행 중인 작업이 있으면 그 작업을 돌려준다
  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @AllowDuringUnlinking()
  @UserThrottle(EXPORT_REQUEST_THROTTLE)
  request(@CurrentCouple() couple: CoupleContext, @CurrentUser() me: AuthUser): Promise<ExportJob> {
    return this.exports.request(couple.id, me.id)
  }

  @Get()
  latest(@CurrentCouple() couple: CoupleContext): Promise<LatestExportResponse> {
    return this.exports.latest(couple.id)
  }

  @Get(':jobId')
  get(@CurrentCouple() couple: CoupleContext, @Param('jobId', idPipe) jobId: string): Promise<ExportJob> {
    return this.exports.get(couple.id, jobId)
  }
}
