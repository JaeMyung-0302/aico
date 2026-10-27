import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common'
import {
  type BulkCreateQuotesRequest,
  bulkCreateQuotesRequestSchema,
  type BulkCreateQuotesResponse,
  type CreateQuoteRequest,
  createQuoteRequestSchema,
  type CreateScreenshotUploadRequest,
  createScreenshotUploadRequestSchema,
  type CreateScreenshotUploadResponse,
  type CursorQuery,
  cursorQuerySchema,
  idSchema,
  type Quote,
  type QuoteListResponse,
  type UpdateQuoteRequest,
  updateQuoteRequestSchema,
} from '@you-in-heart/shared'
import { Authenticated } from '../auth/decorators/authenticated.decorator'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import type { AuthUser } from '../auth/guards/jwt-auth.guard'
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe'
import { UserThrottle } from '../common/throttle/user-throttle.guard'
import { type CoupleContext, CurrentCouple } from '../couples/decorators/current-couple.decorator'
import { QuotesService } from './quotes.service'

const idPipe = new ZodValidationPipe(idSchema)

// screenshot/complete는 스크린샷을 읽어 재인코딩한다(메모리·CPU) → 사용자당 60회/분. 넘으면 429 RATE_LIMITED
const SCREENSHOT_COMPLETE_THROTTLE = { name: 'screenshot-complete', ttl: 60_000, limit: 60 }

// 모든 /quotes 요청 본문은 64KB 상한(QuoteBodyLimitMiddleware, 413)
@Controller('quotes')
@Authenticated()
export class QuotesController {
  constructor(private readonly quotes: QuotesService) {}

  @Get()
  list(
    @CurrentCouple() couple: CoupleContext,
    @Query(new ZodValidationPipe(cursorQuerySchema)) query: CursorQuery,
  ): Promise<QuoteListResponse> {
    return this.quotes.list(couple.id, query)
  }

  @Post()
  create(
    @CurrentCouple() couple: CoupleContext,
    @CurrentUser() me: AuthUser,
    @Body(new ZodValidationPipe(createQuoteRequestSchema)) body: CreateQuoteRequest,
  ): Promise<Quote> {
    return this.quotes.create(couple.id, me.id, body)
  }

  @Post('bulk')
  bulkCreate(
    @CurrentCouple() couple: CoupleContext,
    @CurrentUser() me: AuthUser,
    @Body(new ZodValidationPipe(bulkCreateQuotesRequestSchema)) body: BulkCreateQuotesRequest,
  ): Promise<BulkCreateQuotesResponse> {
    return this.quotes.bulkCreate(couple.id, me.id, body)
  }

  @Post('screenshots/uploads')
  createScreenshotUpload(
    @CurrentCouple() couple: CoupleContext,
    @CurrentUser() me: AuthUser,
    @Body(new ZodValidationPipe(createScreenshotUploadRequestSchema)) body: CreateScreenshotUploadRequest,
  ): Promise<CreateScreenshotUploadResponse> {
    return this.quotes.createScreenshotUpload(couple.id, me.id, body)
  }

  @Get(':id')
  get(@CurrentCouple() couple: CoupleContext, @Param('id', idPipe) id: string): Promise<Quote> {
    return this.quotes.get(couple.id, id)
  }

  @Patch(':id')
  update(
    @CurrentCouple() couple: CoupleContext,
    @Param('id', idPipe) id: string,
    @Body(new ZodValidationPipe(updateQuoteRequestSchema)) body: UpdateQuoteRequest,
  ): Promise<Quote> {
    return this.quotes.update(couple.id, id, body)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentCouple() couple: CoupleContext, @Param('id', idPipe) id: string): Promise<void> {
    return this.quotes.remove(couple.id, id)
  }

  @Post(':id/screenshot/complete')
  @HttpCode(HttpStatus.OK)
  @UserThrottle(SCREENSHOT_COMPLETE_THROTTLE)
  completeScreenshot(
    @CurrentCouple() couple: CoupleContext,
    @CurrentUser() me: AuthUser,
    @Param('id', idPipe) id: string,
  ): Promise<Quote> {
    return this.quotes.completeScreenshot(couple.id, me.id, id)
  }
}
