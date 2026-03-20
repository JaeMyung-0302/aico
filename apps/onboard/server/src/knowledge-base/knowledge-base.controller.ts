import { Controller, Get, Post, Body, Headers, UseGuards, Req, HttpCode } from '@nestjs/common'
import { KnowledgeBaseService } from './knowledge-base.service'
import { SyncProcessor } from './sync.processor'
import { AuthGuard } from '../auth/guards/auth.guard'
import type { AuthenticatedRequest } from '../common/interfaces/authenticated-request'

class SyncRequestDto {
  integrationId!: string
}

@Controller('knowledge-base')
@UseGuards(AuthGuard)
export class KnowledgeBaseController {
  constructor(
    private readonly knowledgeBaseService: KnowledgeBaseService,
    private readonly syncProcessor: SyncProcessor,
  ) {}

  @Post('sync')
  @HttpCode(202)
  requestSync(
    @Body() dto: SyncRequestDto,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    this.syncProcessor.addJob({
      integrationId: dto.integrationId,
      tenantId,
    })

    return { status: 'queued', message: '동기화 작업이 큐에 추가되었습니다.' }
  }

  @Get('documents')
  getDocuments(@Headers('x-tenant-id') tenantId: string) {
    return this.knowledgeBaseService.getDocuments(tenantId)
  }

  @Get('status')
  getStatus(@Headers('x-tenant-id') tenantId: string) {
    return this.knowledgeBaseService.getSyncStatus(tenantId)
  }
}
