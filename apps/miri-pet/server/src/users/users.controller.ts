import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common'
import {
  type ConsentKind,
  consentKindSchema,
  idSchema,
  type Me,
  type MyConsent,
  submitConsentsRequestSchema,
  type UpdateConsentRequest,
  updateConsentRequestSchema,
  type UpdateMeRequest,
  updateMeRequestSchema,
  type UserProfile,
} from '@miri-pet/shared'
import { z } from 'zod'
import { AllowWithoutConsent, Authenticated } from '../auth/decorators/authenticated.decorator'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import type { AuthUser } from '../auth/guards/jwt-auth.guard'
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe'
import { UserThrottle } from '../common/throttle/user-throttle.guard'
import { AccountDeletionService } from './account-deletion.service'
import { type ConsentSubmission, ConsentService } from './consent.service'
import { UsersService } from './users.service'

// 선택 동의 토글: 켤 때마다 동의 이력 행이 쌓이므로 사용자당 분당 10회로 묶는다
const CONSENT_UPDATE_THROTTLE = { ttl: 60_000, limit: 10 }

// 만 14세 미만(false)을 400이 아닌 422로 응답하려고 boolean으로 받는다
const consentSubmissionSchema = submitConsentsRequestSchema.extend({ isAge14OrOlder: z.boolean() })

@Controller()
@Authenticated()
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly consents: ConsentService,
    private readonly deletion: AccountDeletionService,
  ) {}

  @Get('me')
  @AllowWithoutConsent()
  getMe(@CurrentUser() me: AuthUser): Promise<Me> {
    return this.users.getMe(me.id)
  }

  @Patch('me')
  @AllowWithoutConsent()
  updateMe(
    @CurrentUser() me: AuthUser,
    @Body(new ZodValidationPipe(updateMeRequestSchema)) body: UpdateMeRequest,
  ): Promise<Me> {
    return this.users.updateMe(me.id, body)
  }

  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  @AllowWithoutConsent()
  deleteMe(@CurrentUser() me: AuthUser): Promise<void> {
    return this.deletion.deleteAccount(me.id)
  }

  @Post('me/consents')
  @HttpCode(HttpStatus.NO_CONTENT)
  @AllowWithoutConsent()
  submitConsents(
    @CurrentUser() me: AuthUser,
    @Body(new ZodValidationPipe(consentSubmissionSchema)) body: ConsentSubmission,
  ): Promise<void> {
    return this.consents.submit(me.id, body)
  }

  // 설정 > 동의 내역 관리 (동의 완료 후에만)
  @Get('me/consents')
  listConsents(@CurrentUser() me: AuthUser): Promise<MyConsent[]> {
    return this.consents.list(me.id)
  }

  // 선택 동의(LOCATION·MARKETING)만 켜고 끈다. 필수는 400 CONSENT_REQUIRED_KIND
  @Patch('me/consents/:kind')
  @UserThrottle({ name: 'consent-update', ...CONSENT_UPDATE_THROTTLE })
  updateConsent(
    @CurrentUser() me: AuthUser,
    @Param('kind', new ZodValidationPipe(consentKindSchema)) kind: ConsentKind,
    @Body(new ZodValidationPipe(updateConsentRequestSchema)) body: UpdateConsentRequest,
  ): Promise<MyConsent[]> {
    return this.consents.update(me.id, kind, body.agreed)
  }

  @Get('users/:id')
  getProfile(
    @CurrentUser() me: AuthUser,
    @Param('id', new ZodValidationPipe(idSchema)) id: string,
  ): Promise<UserProfile> {
    return this.users.getProfile(me.id, id)
  }
}
