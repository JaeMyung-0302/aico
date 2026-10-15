import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common'
import { SkipThrottle, Throttle } from '@nestjs/throttler'
import {
  type AuthTokens,
  type DevLoginRequest,
  devLoginRequestSchema,
  type RefreshRequest,
  refreshRequestSchema,
  type SocialLoginRequest,
  socialLoginRequestSchema,
} from '@miri-pet/shared'
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe'
import { AuthService } from './auth.service'
import { DevLoginGuard } from './guards/dev-login.guard'
import { SessionService } from './session.service'

// 클라이언트 IP당 라우트별 분당 10회 (전역 120회/분보다 엄격)
export const AUTH_THROTTLE = { ttl: 60_000, limit: 10 }

@Controller('auth')
@Throttle({ default: AUTH_THROTTLE })
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly sessions: SessionService,
  ) {}

  @Post('kakao')
  @HttpCode(HttpStatus.OK)
  kakao(@Body(new ZodValidationPipe(socialLoginRequestSchema)) body: SocialLoginRequest): Promise<AuthTokens> {
    return this.auth.socialLogin('KAKAO', body)
  }

  @Post('google')
  @HttpCode(HttpStatus.OK)
  google(@Body(new ZodValidationPipe(socialLoginRequestSchema)) body: SocialLoginRequest): Promise<AuthTokens> {
    return this.auth.socialLogin('GOOGLE', body)
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body(new ZodValidationPipe(refreshRequestSchema)) body: RefreshRequest): Promise<AuthTokens> {
    const tokens = await this.sessions.rotate(body.refreshToken)
    return { ...tokens, isNewUser: false }
  }

  // access가 만료돼도 로그아웃할 수 있게 refresh만 받는다
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Body(new ZodValidationPipe(refreshRequestSchema)) body: RefreshRequest): Promise<void> {
    return this.sessions.revoke(body.refreshToken)
  }

  // 운영에서는 DevLoginGuard가 404로 막는다. E2E·통합 테스트가 한 IP에서 여러 계정으로 로그인하므로 제한 제외
  @Post('dev')
  @HttpCode(HttpStatus.OK)
  @SkipThrottle()
  @UseGuards(DevLoginGuard)
  dev(@Body(new ZodValidationPipe(devLoginRequestSchema)) body: DevLoginRequest): Promise<AuthTokens> {
    return this.auth.devLogin(body)
  }
}
