import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common'
import {
  type AnniversaryListResponse,
  type AnniversaryRangeQuery,
  anniversaryRangeQuerySchema,
  type CreateCustomAnniversaryRequest,
  createCustomAnniversaryRequestSchema,
  type CustomAnniversary,
  type CustomAnniversaryListResponse,
  idSchema,
  MAX_ANNIVERSARY_RANGE_DAYS,
  type UpdateCustomAnniversaryRequest,
  updateCustomAnniversaryRequestSchema,
} from '@you-in-heart/shared'
import { Authenticated } from '../auth/decorators/authenticated.decorator'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import type { AuthUser } from '../auth/guards/jwt-auth.guard'
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe'
import { type CoupleContext, CurrentCouple } from '../couples/decorators/current-couple.decorator'
import { AnniversariesService, daysBetween } from './anniversaries.service'

// zod 4는 필드가 이미 실패해도 객체 refine을 실행한다 → 잘못된 날짜는 필드 오류에 맡기고 여기서는 통과
const isWithinMaxRange = ({ from, to }: AnniversaryRangeQuery): boolean => {
  try {
    return daysBetween(from, to) <= MAX_ANNIVERSARY_RANGE_DAYS
  } catch {
    return true
  }
}

// 범위가 너무 넓으면 100일 단위 항목이 커진다 → 10년으로 제한
const rangeQuerySchema = anniversaryRangeQuerySchema.refine(isWithinMaxRange, {
  message: `조회 범위는 ${MAX_ANNIVERSARY_RANGE_DAYS}일 이하여야 합니다`,
  path: ['to'],
})

// :id는 uuid만(자동 기념일 id 'auto:…'는 400)
const idPipe = new ZodValidationPipe(idSchema)

@Controller('anniversaries')
@Authenticated()
export class AnniversariesController {
  constructor(private readonly anniversaries: AnniversariesService) {}

  @Get()
  list(
    @CurrentCouple() couple: CoupleContext,
    @Query(new ZodValidationPipe(rangeQuerySchema)) query: AnniversaryRangeQuery,
  ): Promise<AnniversaryListResponse> {
    return this.anniversaries.list(couple.id, query)
  }

  @Get('custom')
  listCustom(@CurrentCouple() couple: CoupleContext): Promise<CustomAnniversaryListResponse> {
    return this.anniversaries.listCustom(couple.id)
  }

  @Post()
  create(
    @CurrentCouple() couple: CoupleContext,
    @CurrentUser() me: AuthUser,
    @Body(new ZodValidationPipe(createCustomAnniversaryRequestSchema)) body: CreateCustomAnniversaryRequest,
  ): Promise<CustomAnniversary> {
    return this.anniversaries.create(couple.id, me.id, body)
  }

  @Patch(':id')
  update(
    @CurrentCouple() couple: CoupleContext,
    @Param('id', idPipe) id: string,
    @Body(new ZodValidationPipe(updateCustomAnniversaryRequestSchema)) body: UpdateCustomAnniversaryRequest,
  ): Promise<CustomAnniversary> {
    return this.anniversaries.update(couple.id, id, body)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentCouple() couple: CoupleContext, @Param('id', idPipe) id: string): Promise<void> {
    return this.anniversaries.remove(couple.id, id)
  }
}
