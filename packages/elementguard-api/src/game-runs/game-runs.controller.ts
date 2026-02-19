import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GameRunsService } from './game-runs.service';
import { CreateGameRunDto } from './dto/create-game-run.dto';

@Controller('game-runs')
@UseGuards(JwtAuthGuard)
export class GameRunsController {
  constructor(private readonly gameRunsService: GameRunsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Request() req: { user: { userId: string } },
    @Body() dto: CreateGameRunDto,
  ) {
    return this.gameRunsService.saveGameRun(req.user.userId, dto);
  }

  @Get()
  async findAll(
    @Request() req: { user: { userId: string } },
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 10;
    return this.gameRunsService.getGameRuns(
      req.user.userId,
      Math.min(Math.max(1, isNaN(parsedLimit) ? 10 : parsedLimit), 50),
    );
  }
}
