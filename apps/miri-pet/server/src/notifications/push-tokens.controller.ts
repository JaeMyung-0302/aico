import { Body, Controller, Delete, HttpCode, HttpStatus, Put } from '@nestjs/common'
import { type RegisterPushTokenRequest, registerPushTokenRequestSchema } from '@miri-pet/shared'
import { z } from 'zod'
import { Authenticated } from '../auth/decorators/authenticated.decorator'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import type { AuthUser } from '../auth/guards/jwt-auth.guard'
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe'
import { PushService } from './push.service'

const removePushTokenSchema = registerPushTokenRequestSchema.pick({ expoToken: true })

@Controller('push-tokens')
@Authenticated()
export class PushTokensController {
  constructor(private readonly push: PushService) {}

  // 앱 시작·알림 권한 허용 시 등록(멱등)
  @Put()
  @HttpCode(HttpStatus.NO_CONTENT)
  register(
    @CurrentUser() me: AuthUser,
    @Body(new ZodValidationPipe(registerPushTokenRequestSchema)) body: RegisterPushTokenRequest,
  ): Promise<void> {
    return this.push.registerToken(me.id, body)
  }

  // 로그아웃 직전에 호출해 이 기기로 더 보내지 않게 한다
  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() me: AuthUser,
    @Body(new ZodValidationPipe(removePushTokenSchema)) body: z.infer<typeof removePushTokenSchema>,
  ): Promise<void> {
    return this.push.removeToken(me.id, body.expoToken)
  }
}
