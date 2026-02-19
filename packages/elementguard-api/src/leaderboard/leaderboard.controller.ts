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
import { LeaderboardService } from './leaderboard.service';
import { SubmitLeaderboardDto } from './dto/submit-leaderboard.dto';

@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Get('weekly')
  async getWeekly(@Query('limit') limit?: string) {
    const parsedLimit = limit ? parseInt(limit, 10) : 10;
    return this.leaderboardService.getWeeklyLeaderboard(
      Math.min(Math.max(1, isNaN(parsedLimit) ? 10 : parsedLimit), 50),
    );
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async submit(
    @Request() req: { user: { userId: string } },
    @Body() dto: SubmitLeaderboardDto,
  ) {
    return this.leaderboardService.submitEntry(req.user.userId, dto);
  }
}
