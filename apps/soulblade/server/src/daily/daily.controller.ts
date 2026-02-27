import { Controller, Get, Post, Req, UseGuards } from '@nestjs/common'
import { Request } from 'express'
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard'
import { DailyService } from './daily.service'

@Controller('daily')
@UseGuards(SupabaseAuthGuard)
export class DailyController {
  constructor(private readonly dailyService: DailyService) {}

  @Get('status')
  status(@Req() req: Request) {
    const { id } = req.user as { id: string }
    return this.dailyService.getStatus(id)
  }

  @Post('claim')
  claim(@Req() req: Request) {
    const { id } = req.user as { id: string }
    return this.dailyService.claimAttendance(id)
  }
}
