import { Controller, Get, Post, Delete, Body, Param, Headers, UseGuards } from '@nestjs/common'
import { IntegrationsService } from './integrations.service'
import { AuthGuard } from '../auth/guards/auth.guard'
import { TenantGuard } from '../common/guards/tenant.guard'
import { CreateIntegrationDto } from './dto/create-integration.dto'

@Controller('integrations')
@UseGuards(AuthGuard, TenantGuard)
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Post()
  createIntegration(
    @Body() dto: CreateIntegrationDto,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    return this.integrationsService.createIntegration(
      dto.type,
      dto.accessToken,
      tenantId,
      dto.config,
    )
  }

  @Get()
  listIntegrations(@Headers('x-tenant-id') tenantId: string) {
    return this.integrationsService.listIntegrations(tenantId)
  }

  @Delete(':id')
  deleteIntegration(
    @Param('id') id: string,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    return this.integrationsService.deleteIntegration(id, tenantId)
  }

  @Post(':id/test')
  testConnection(
    @Param('id') id: string,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    return this.integrationsService.testConnection(id, tenantId)
  }
}
