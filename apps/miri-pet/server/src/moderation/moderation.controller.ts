import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common'
import { type BlockList, type CreateReportRequest, createReportRequestSchema, idSchema } from '@miri-pet/shared'
import { Authenticated } from '../auth/decorators/authenticated.decorator'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import type { AuthUser } from '../auth/guards/jwt-auth.guard'
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe'
import { BlockService } from './block.service'
import { ReportService } from './report.service'

const userIdParam = new ZodValidationPipe(idSchema)

@Controller('blocks')
@Authenticated()
export class BlocksController {
  constructor(private readonly blocks: BlockService) {}

  @Get()
  list(@CurrentUser() me: AuthUser): Promise<BlockList> {
    return this.blocks.list(me.id)
  }

  @Post(':userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  block(@CurrentUser() me: AuthUser, @Param('userId', userIdParam) userId: string): Promise<void> {
    return this.blocks.block(me.id, userId)
  }

  @Delete(':userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  unblock(@CurrentUser() me: AuthUser, @Param('userId', userIdParam) userId: string): Promise<void> {
    return this.blocks.unblock(me.id, userId)
  }
}

@Controller('reports')
@Authenticated()
export class ReportsController {
  constructor(private readonly reports: ReportService) {}

  @Post()
  create(
    @CurrentUser() me: AuthUser,
    @Body(new ZodValidationPipe(createReportRequestSchema)) body: CreateReportRequest,
  ): Promise<{ id: string }> {
    return this.reports.create(me.id, body)
  }
}
