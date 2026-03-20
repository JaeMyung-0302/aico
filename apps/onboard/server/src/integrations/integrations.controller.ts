import { Controller, Get, Post, Delete, Body, Param, Headers, UseGuards, Req } from '@nestjs/common'
import { IntegrationsService } from './integrations.service'
import { AuthGuard } from '../auth/guards/auth.guard'
import { CreateIntegrationDto } from './dto/create-integration.dto'
import type { AuthenticatedRequest } from '../common/interfaces/authenticated-request'

@Controller('integrations')
@UseGuards(AuthGuard)
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Post()
  createIntegration(
    @Body() dto: CreateIntegrationDto,
    @Headers('x-tenant-id') tenantId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.integrationsService.createIntegration(
      dto.type,
      dto.accessToken,
      tenantId,
      req.user.id,
      dto.config,
    )
  }

  @Get()
  listIntegrations(
    @Headers('x-tenant-id') tenantId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.integrationsService.listIntegrations(tenantId, req.user.id)
  }

  @Delete(':id')
  deleteIntegration(
    @Param('id') id: string,
    @Headers('x-tenant-id') tenantId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.integrationsService.deleteIntegration(id, tenantId, req.user.id)
  }

  @Post(':id/test')
  testConnection(
    @Param('id') id: string,
    @Headers('x-tenant-id') tenantId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.integrationsService.testConnection(id, tenantId, req.user.id)
  }
}
