import { Controller, Get, Patch, Body, Req, UseGuards } from '@nestjs/common'
import { Request } from 'express'
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard'
import { ProfilesService } from './profiles.service'
import { UpdateProfileDto } from './dto/update-profile.dto'

@Controller('profiles')
@UseGuards(SupabaseAuthGuard)
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get('me')
  getMe(@Req() req: Request) {
    const { id } = req.user as { id: string }
    return this.profilesService.getMyProfile(id)
  }

  @Patch('me')
  updateMe(@Req() req: Request, @Body() dto: UpdateProfileDto) {
    const { id } = req.user as { id: string }
    return this.profilesService.updateDisplayName(id, dto.displayName)
  }
}
