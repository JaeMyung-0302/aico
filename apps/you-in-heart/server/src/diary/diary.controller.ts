import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common'
import {
  type CreateAutoDaysRequest,
  createAutoDaysRequestSchema,
  type CreateAutoDaysResponse,
  type CreateDiaryRequest,
  createDiaryRequestSchema,
  type DiaryEntry,
  type DiaryListQuery,
  diaryListQuerySchema,
  type DiaryListResponse,
  idSchema,
  type UpdateDiaryRequest,
  updateDiaryRequestSchema,
} from '@you-in-heart/shared'
import { Authenticated } from '../auth/decorators/authenticated.decorator'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import type { AuthUser } from '../auth/guards/jwt-auth.guard'
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe'
import { type CoupleContext, CurrentCouple } from '../couples/decorators/current-couple.decorator'
import { DiaryService } from './diary.service'

const idPipe = new ZodValidationPipe(idSchema)

@Controller('diary')
@Authenticated()
export class DiaryController {
  constructor(private readonly diary: DiaryService) {}

  @Get()
  list(
    @CurrentCouple() couple: CoupleContext,
    @Query(new ZodValidationPipe(diaryListQuerySchema)) query: DiaryListQuery,
  ): Promise<DiaryListResponse> {
    return this.diary.list(couple.id, query)
  }

  @Post()
  create(
    @CurrentCouple() couple: CoupleContext,
    @CurrentUser() me: AuthUser,
    @Body(new ZodValidationPipe(createDiaryRequestSchema)) body: CreateDiaryRequest,
  ): Promise<DiaryEntry> {
    return this.diary.create(couple.id, me.id, body)
  }

  // 멱등(이미 있으면 그 엔트리를 돌려준다) → 200
  @Post('auto-days')
  @HttpCode(HttpStatus.OK)
  createAutoDays(
    @CurrentCouple() couple: CoupleContext,
    @CurrentUser() me: AuthUser,
    @Body(new ZodValidationPipe(createAutoDaysRequestSchema)) body: CreateAutoDaysRequest,
  ): Promise<CreateAutoDaysResponse> {
    return this.diary.createAutoDays(couple.id, me.id, body)
  }

  @Get(':id')
  get(@CurrentCouple() couple: CoupleContext, @Param('id', idPipe) id: string): Promise<DiaryEntry> {
    return this.diary.get(couple.id, id)
  }

  @Patch(':id')
  update(
    @CurrentCouple() couple: CoupleContext,
    @CurrentUser() me: AuthUser,
    @Param('id', idPipe) id: string,
    @Body(new ZodValidationPipe(updateDiaryRequestSchema)) body: UpdateDiaryRequest,
  ): Promise<DiaryEntry> {
    return this.diary.update(couple.id, me.id, id, body)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentCouple() couple: CoupleContext,
    @CurrentUser() me: AuthUser,
    @Param('id', idPipe) id: string,
  ): Promise<void> {
    return this.diary.remove(couple.id, me.id, id)
  }
}
