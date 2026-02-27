import { Controller, Get, Put, Body, Req, UseGuards } from '@nestjs/common'
import { Request } from 'express'
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard'
import { SavesService } from './saves.service'
import { UpsertSaveDto } from './dto/upsert-save.dto'

@Controller('saves')
@UseGuards(SupabaseAuthGuard)
export class SavesController {
  constructor(private readonly savesService: SavesService) {}

  @Get()
  load(@Req() req: Request) {
    const { id } = req.user as { id: string }
    return this.savesService.loadSave(id)
  }

  @Put()
  save(@Req() req: Request, @Body() dto: UpsertSaveDto) {
    const { id } = req.user as { id: string }
    return this.savesService.upsertSave(id, dto.saveData)
  }
}
