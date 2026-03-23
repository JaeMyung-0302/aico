import { Controller, Get, Post, Patch, Body, Param, Headers, UseGuards, Req } from '@nestjs/common'
import { ChecklistsService } from './checklists.service'
import { AuthGuard } from '../auth/guards/auth.guard'
import { TenantGuard } from '../common/guards/tenant.guard'
import { CreateChecklistDto } from './dto/create-checklist.dto'
import type { AuthenticatedRequest } from '../common/interfaces/authenticated-request'

@Controller('checklists')
@UseGuards(AuthGuard, TenantGuard)
export class ChecklistsController {
  constructor(private readonly checklistsService: ChecklistsService) {}

  @Post()
  createChecklist(
    @Body() dto: CreateChecklistDto,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    return this.checklistsService.createChecklist(dto.title, dto.items, tenantId)
  }

  @Get()
  getChecklists(@Headers('x-tenant-id') tenantId: string) {
    return this.checklistsService.getChecklists(tenantId)
  }

  @Patch(':id/items/:itemId/toggle')
  toggleItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Headers('x-tenant-id') tenantId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.checklistsService.toggleItem(id, itemId, tenantId, req.tenantMember!.id)
  }

  @Get(':id/progress')
  getProgress(
    @Param('id') id: string,
    @Headers('x-tenant-id') tenantId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.checklistsService.getProgress(id, req.tenantMember!.id, tenantId)
  }
}
