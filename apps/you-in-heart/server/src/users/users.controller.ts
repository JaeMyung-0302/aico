import { Body, Controller, Get, Patch, Put } from '@nestjs/common'
import {
  type Consents,
  type MeResponse,
  type PutConsentsRequest,
  putConsentsRequestSchema,
  type UpdateMeRequest,
  updateMeRequestSchema,
} from '@you-in-heart/shared'
import { Authenticated } from '../auth/decorators/authenticated.decorator'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import type { AuthUser } from '../auth/guards/jwt-auth.guard'
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe'
import { ConsentService } from './consent.service'
import { UsersService } from './users.service'

// 회원 탈퇴(DELETE /me)는 0E.10에서 붙인다
@Controller('me')
@Authenticated()
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly consents: ConsentService,
  ) {}

  @Get()
  getMe(@CurrentUser() me: AuthUser): Promise<MeResponse> {
    return this.users.getMe(me.id)
  }

  @Patch()
  updateMe(
    @CurrentUser() me: AuthUser,
    @Body(new ZodValidationPipe(updateMeRequestSchema)) body: UpdateMeRequest,
  ): Promise<MeResponse> {
    return this.users.updateMe(me.id, body)
  }

  @Put('consents')
  putConsents(
    @CurrentUser() me: AuthUser,
    @Body(new ZodValidationPipe(putConsentsRequestSchema)) body: PutConsentsRequest,
  ): Promise<Consents> {
    return this.consents.put(me.id, body)
  }
}
