import { Controller, Get, Post, Patch, Body, Param, Headers, UseGuards, Req } from '@nestjs/common'
import { ChecklistsService } from './checklists.service'
import { AuthGuard } from '../auth/guards/auth.guard'
import { CreateChecklistDto } from './dto/create-checklist.dto'
import type { AuthenticatedRequest } from '../common/interfaces/authenticated-request'

@Controller('checklists')
@UseGuards(AuthGuard)
export class ChecklistsController {
  constructor(private readonly checklistsService: ChecklistsService) {}

  @Post()
  createChecklist(
    @Body() dto: CreateChecklistDto,
    @Headers('x-tenant-id') tenantId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.checklistsService.createChecklist(dto.title, dto.items, tenantId, req.user.id)
  }

  @Get()
  getChecklists(
    @Headers('x-tenant-id') tenantId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.checklistsService.getChecklists(tenantId, req.user.id)
  }

  @Patch(':id/items/:itemId/toggle')
  toggleItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Headers('x-tenant-id') tenantId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.checklistsService.toggleItem(id, itemId, tenantId, req.user.id)
  }

  @Get(':id/progress')
  getProgress(
    @Param('id') id: string,
    @Headers('x-tenant-id') tenantId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.checklistsService.getProgress(id, tenantId, req.user.id)
  }
}
