import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common'
import { Request } from 'express'
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard'
import { RunsService } from './runs.service'
import { CompleteRunDto } from './dto/complete-run.dto'

@Controller('runs')
@UseGuards(SupabaseAuthGuard)
export class RunsController {
  constructor(private readonly runsService: RunsService) {}

  @Post('complete')
  complete(@Req() req: Request, @Body() dto: CompleteRunDto) {
    const { id } = req.user as { id: string }
    return this.runsService.completeRun(id, dto)
  }
}
