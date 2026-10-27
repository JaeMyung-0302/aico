import { Body, Controller, Delete, HttpCode, HttpStatus, Param, Post } from '@nestjs/common'
import { type RegisterPushTokenRequest, registerPushTokenRequestSchema } from '@you-in-heart/shared'
import { Authenticated } from '../auth/decorators/authenticated.decorator'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import type { AuthUser } from '../auth/guards/jwt-auth.guard'
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe'
import { AllowWithoutCouple } from '../couples/decorators/allow-without-couple.decorator'
import { PushService } from './push.service'

const pushTokenParamSchema = registerPushTokenRequestSchema.shape.token

@Controller('me/push-tokens')
@Authenticated()
@AllowWithoutCouple()
export class PushTokensController {
  constructor(private readonly push: PushService) {}

  // 앱 시작·알림 권한 허용 시 등록(멱등)
  @Post()
  @HttpCode(HttpStatus.NO_CONTENT)
  register(
    @CurrentUser() me: AuthUser,
    @Body(new ZodValidationPipe(registerPushTokenRequestSchema)) body: RegisterPushTokenRequest,
  ): Promise<void> {
    return this.push.registerToken(me.id, body)
  }

  // 로그아웃 직전에 호출해 이 기기로 더 보내지 않게 한다. 토큰은 URL 인코딩해서 보낸다
  @Delete(':token')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() me: AuthUser,
    @Param('token', new ZodValidationPipe(pushTokenParamSchema)) token: string,
  ): Promise<void> {
    return this.push.removeToken(me.id, token)
  }
}
