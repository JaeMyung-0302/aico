import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { UpgradesService } from './upgrades.service';
import { PurchaseUpgradeDto } from './dto/purchase-upgrade.dto';

@Controller('upgrades')
@UseGuards(SupabaseAuthGuard)
export class UpgradesController {
  constructor(private readonly upgradesService: UpgradesService) {}

  @Post('purchase')
  purchase(@Req() req: Request, @Body() dto: PurchaseUpgradeDto) {
    const { id } = req.user as { id: string };
    return this.upgradesService.purchaseUpgrade(id, dto);
  }
}
