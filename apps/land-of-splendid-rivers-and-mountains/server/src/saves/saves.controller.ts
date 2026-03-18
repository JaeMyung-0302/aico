import {
  Controller,
  Get,
  Put,
  Delete,
  Param,
  Body,
  Headers,
  ParseIntPipe,
  BadRequestException,
  UseGuards,
} from '@nestjs/common'
import { SavesService } from './saves.service'
import { UpsertSaveDto } from './saves.dto'
import { UserExistsGuard } from '../common/guards/user-exists.guard'

@Controller('saves')
@UseGuards(UserExistsGuard)
export class SavesController {
  constructor(private readonly savesService: SavesService) {}

  @Put(':slot')
  async upsert(
    @Headers('x-user-id') userId: string,
    @Param('slot', ParseIntPipe) slot: number,
    @Body() dto: UpsertSaveDto,
  ) {
    if (slot < 1 || slot > 3) throw new BadRequestException('slot must be 1-3')
    const save = await this.savesService.upsert(userId, slot, dto.data, dto.version)
    return { slot: save.slot, version: save.version, updatedAt: save.updatedAt }
  }

  @Get()
  async findAll(@Headers('x-user-id') userId: string) {
    return this.savesService.findAll(userId)
  }

  @Get(':slot')
  async findOne(
    @Headers('x-user-id') userId: string,
    @Param('slot', ParseIntPipe) slot: number,
  ) {
    return this.savesService.findOne(userId, slot)
  }

  @Delete(':slot')
  async remove(
    @Headers('x-user-id') userId: string,
    @Param('slot', ParseIntPipe) slot: number,
  ) {
    await this.savesService.remove(userId, slot)
    return { success: true }
  }
}
