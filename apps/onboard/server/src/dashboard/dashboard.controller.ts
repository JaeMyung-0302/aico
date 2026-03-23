import { Controller, Get, Headers, UseGuards } from '@nestjs/common'
import { DashboardService } from './dashboard.service'
import { AuthGuard } from '../auth/guards/auth.guard'
import { TenantGuard } from '../common/guards/tenant.guard'

@Controller('dashboard')
@UseGuards(AuthGuard, TenantGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  getStats(@Headers('x-tenant-id') tenantId: string) {
    return this.dashboardService.getTeamStats(tenantId)
  }

  @Get('members-progress')
  getMembersProgress(@Headers('x-tenant-id') tenantId: string) {
    return this.dashboardService.getMembersProgress(tenantId)
  }
}
