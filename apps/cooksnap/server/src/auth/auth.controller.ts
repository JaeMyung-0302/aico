import { Controller, Get, UseGuards, Req } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { AuthGuard } from './guards/auth.guard'
import { PremiumService } from '../premium/premium.service'

@Controller('auth')
export class AuthController {
  constructor(
    private readonly premiumService: PremiumService,
    private readonly configService: ConfigService,
  ) {}

  @Get('me')
  @UseGuards(AuthGuard)
  getMe(@Req() req: any) {
    const adminEmails = this.configService.get<string>('admin.emails') || ''
    const allowedEmails = adminEmails
      .split(',')
      .map((e: string) => e.trim().toLowerCase())
      .filter(Boolean)
    const isAdmin = allowedEmails.includes(req.user.email.toLowerCase())

    return {
      ...req.user,
      isPremium: this.premiumService.isPremiumActive(req.user),
      isAdmin,
    }
  }
}
