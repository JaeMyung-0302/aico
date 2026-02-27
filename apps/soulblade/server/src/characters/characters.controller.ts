import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common'
import { Request } from 'express'
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard'
import { CharactersService } from './characters.service'
import { UpsertCharacterDto } from './dto/upsert-character.dto'

@Controller('characters')
@UseGuards(SupabaseAuthGuard)
export class CharactersController {
  constructor(private readonly charactersService: CharactersService) {}

  @Get()
  findAll(@Req() req: Request) {
    const { id } = req.user as { id: string }
    return this.charactersService.findAll(id)
  }

  @Get(':classType')
  findOne(@Req() req: Request, @Param('classType') classType: string) {
    const { id } = req.user as { id: string }
    return this.charactersService.findByClassType(id, classType)
  }

  @Put(':classType')
  upsert(
    @Req() req: Request,
    @Param('classType') classType: string,
    @Body() dto: UpsertCharacterDto,
  ) {
    const { id } = req.user as { id: string }
    return this.charactersService.upsert(id, classType, dto)
  }
}
