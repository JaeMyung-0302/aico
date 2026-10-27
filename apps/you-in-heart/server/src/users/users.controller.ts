import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Patch, Put } from '@nestjs/common'
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
import { AllowWithoutCouple } from '../couples/decorators/allow-without-couple.decorator'
import { AccountDeletionService } from './account-deletion.service'
import { ConsentService } from './consent.service'
import { UsersService } from './users.service'

// 사용자 단위 데이터라 커플 연결 전·유예 중에도 쓴다(CoupleGuard 예외)
@Controller('me')
@Authenticated()
@AllowWithoutCouple()
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly consents: ConsentService,
    private readonly accountDeletion: AccountDeletionService,
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

  // 회원 탈퇴. 커플이 있으면 연결 해제 유예로 바꾸고 상대에게 알린다
  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteMe(@CurrentUser() me: AuthUser): Promise<void> {
    return this.accountDeletion.deleteAccount(me.id)
  }
}
