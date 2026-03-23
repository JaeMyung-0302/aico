import { Controller, Get, Put, Patch, Param, Body, UseGuards, Req, ParseIntPipe } from '@nestjs/common';
import { SignalsService } from './signals.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AuthenticatedRequest } from '../common/interfaces/authenticated-request';
import { AlertPreferenceDto } from './dto/alert-preference.dto';

@Controller('signals')
@UseGuards(AuthGuard)
export class SignalsController {
  constructor(private readonly signalsService: SignalsService) {}

  @Get('history')
  getHistory(@Req() req: AuthenticatedRequest) {
    return this.signalsService.getSignalHistory(req.user.id);
  }

  @Get('preferences')
  getPreferences(@Req() req: AuthenticatedRequest) {
    return this.signalsService.getPreferences(req.user.id);
  }

  @Put('preferences/:symbol')
  upsertPreference(
    @Req() req: AuthenticatedRequest,
    @Param('symbol') symbol: string,
    @Body() dto: AlertPreferenceDto,
  ) {
    return this.signalsService.upsertPreference(req.user.id, symbol.toUpperCase(), {
      enabled: dto.enabled,
      emailEnabled: dto.emailEnabled,
      pushEnabled: dto.pushEnabled,
    });
  }

  @Patch(':id/read')
  markAsRead(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.signalsService.markAsRead(req.user.id, id);
  }
}
