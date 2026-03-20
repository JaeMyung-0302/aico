import { Controller, Get, Post, Body, Query, Res, UseGuards, Req } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Response } from 'express'
import { AuthService } from './auth.service'
import { AuthGuard } from './guards/auth.guard'
import { PremiumService } from '../premium/premium.service'
import { EmailAuthDto } from './dto/email-auth.dto'

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
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

  @Post('signup')
  signUp(@Body() dto: EmailAuthDto) {
    return this.authService.signUp(dto.email, dto.password)
  }

  @Post('signin')
  signIn(@Body() dto: EmailAuthDto) {
    return this.authService.signIn(dto.email, dto.password)
  }

  @Get('kakao')
  kakaoLogin(@Res() res: Response) {
    const clientId = this.configService.get<string>('kakao.clientId')
    const redirectUri = `${this.getBackendUrl()}/api/v1/auth/kakao/callback`
    const url = `https://kauth.kakao.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code`
    return res.redirect(url)
  }

  @Get('kakao/callback')
  async kakaoCallback(@Query('code') code: string, @Res() res: Response) {
    try {
      const token = await this.authService.handleKakaoCallback(code)
      const frontendUrl = this.configService.get<string>('app.frontendUrl')
      return res.redirect(`${frontendUrl}/auth/callback?token=${token}`)
    } catch (error) {
      const frontendUrl = this.configService.get<string>('app.frontendUrl')
      return res.redirect(`${frontendUrl}/auth?error=kakao_failed`)
    }
  }

  @Get('google')
  googleLogin(@Res() res: Response) {
    const clientId = this.configService.get<string>('google.clientId')
    const redirectUri = `${this.getBackendUrl()}/api/v1/auth/google/callback`
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=email%20profile`
    return res.redirect(url)
  }

  @Get('google/callback')
  async googleCallback(@Query('code') code: string, @Res() res: Response) {
    try {
      const token = await this.authService.handleGoogleCallback(code)
      const frontendUrl = this.configService.get<string>('app.frontendUrl')
      return res.redirect(`${frontendUrl}/auth/callback?token=${token}`)
    } catch (error) {
      const frontendUrl = this.configService.get<string>('app.frontendUrl')
      return res.redirect(`${frontendUrl}/auth?error=google_failed`)
    }
  }

  private getBackendUrl = (): string => {
    const corsOrigins = this.configService.get<string>('cors.origins') || ''
    if (corsOrigins.includes('localhost')) {
      return 'http://localhost:4000'
    }
    return 'https://api.cooksnap.aico-app.com'
  }
}
