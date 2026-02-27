import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common'
import { Request } from 'express'
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard'
import { InventoryService } from './inventory.service'
import { EquipItemDto } from './dto/equip-item.dto'

@Controller('inventory')
@UseGuards(SupabaseAuthGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  findAll(@Req() req: Request) {
    const { id } = req.user as { id: string }
    return this.inventoryService.findAll(id)
  }

  @Patch(':id/equip')
  equip(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) itemId: string,
    @Body() dto: EquipItemDto,
  ) {
    const { id } = req.user as { id: string }
    return this.inventoryService.equipItem(id, itemId, dto.characterId)
  }

  @Patch(':id/unequip')
  unequip(@Req() req: Request, @Param('id', ParseUUIDPipe) itemId: string) {
    const { id } = req.user as { id: string }
    return this.inventoryService.unequipItem(id, itemId)
  }

  @Delete(':id')
  sell(@Req() req: Request, @Param('id', ParseUUIDPipe) itemId: string) {
    const { id } = req.user as { id: string }
    return this.inventoryService.sellItem(id, itemId)
  }
}
