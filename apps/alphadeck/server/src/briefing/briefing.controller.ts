import { Controller, Get, Param, ParseIntPipe, UseGuards, Req } from '@nestjs/common';
import { BriefingService } from './briefing.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AuthenticatedRequest } from '../common/interfaces/authenticated-request';

@Controller('briefings')
@UseGuards(AuthGuard)
export class BriefingController {
  constructor(private readonly briefingService: BriefingService) {}

  @Get()
  getBriefings(@Req() req: AuthenticatedRequest) {
    return this.briefingService.getBriefings(req.user.id);
  }

  @Get(':id')
  getBriefing(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.briefingService.getBriefing(req.user.id, id);
  }
}
