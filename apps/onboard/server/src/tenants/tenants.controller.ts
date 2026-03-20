import { Controller, Get, Post, Body, Param, UseGuards, Req } from '@nestjs/common'
import { TenantsService } from './tenants.service'
import { AuthGuard } from '../auth/guards/auth.guard'
import { CreateTenantDto } from './dto/create-tenant.dto'
import { InviteMemberDto } from './dto/invite-member.dto'
import type { AuthenticatedRequest } from '../common/interfaces/authenticated-request'

@Controller('tenants')
@UseGuards(AuthGuard)
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post()
  createTenant(@Body() dto: CreateTenantDto, @Req() req: AuthenticatedRequest) {
    return this.tenantsService.createTenant(dto.name, dto.slug, req.user.id)
  }

  @Get()
  getMyTenants(@Req() req: AuthenticatedRequest) {
    return this.tenantsService.getMyTenants(req.user.id)
  }

  @Get(':id')
  getTenant(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.tenantsService.getTenant(id, req.user.id)
  }

  @Post(':id/members')
  inviteMember(
    @Param('id') id: string,
    @Body() dto: InviteMemberDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.tenantsService.inviteMember(id, dto.email, req.user.id)
  }
}
