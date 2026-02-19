import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ArchiveService } from './archive.service';
import { AddArchiveItemDto } from './dto/add-archive-item.dto';

@Controller('archive')
@UseGuards(JwtAuthGuard)
export class ArchiveController {
  constructor(private readonly archiveService: ArchiveService) {}

  @Get()
  async findAll(@Request() req: { user: { userId: string } }) {
    return this.archiveService.getArchive(req.user.userId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async addItem(
    @Request() req: { user: { userId: string } },
    @Body() dto: AddArchiveItemDto,
  ) {
    return this.archiveService.addItem(req.user.userId, dto);
  }
}
