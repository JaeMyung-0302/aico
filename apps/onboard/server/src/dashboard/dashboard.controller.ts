import { Controller, Get, Headers, UseGuards, Req } from '@nestjs/common'
import { DashboardService } from './dashboard.service'
import { AuthGuard } from '../auth/guards/auth.guard'
import type { AuthenticatedRequest } from '../common/interfaces/authenticated-request'

@Controller('dashboard')
@UseGuards(AuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  getStats(
    @Headers('x-tenant-id') tenantId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.dashboardService.getTeamStats(tenantId, req.user.id)
  }

  @Get('members-progress')
  getMembersProgress(
    @Headers('x-tenant-id') tenantId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.dashboardService.getMembersProgress(tenantId, req.user.id)
  }
}
