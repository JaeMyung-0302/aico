import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Post } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import {
  type Couple,
  type CreateInviteResponse,
  type JoinCoupleRequest,
  joinCoupleRequestSchema,
  type UpdateCoupleRequest,
  updateCoupleRequestSchema,
} from '@you-in-heart/shared'
import { Authenticated } from '../auth/decorators/authenticated.decorator'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import type { AuthUser } from '../auth/guards/jwt-auth.guard'
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe'
import { UserThrottle } from '../common/throttle/user-throttle.guard'
import { CouplesService } from './couples.service'
import { AllowDuringUnlinking } from './decorators/allow-during-unlinking.decorator'
import { AllowWithoutCouple } from './decorators/allow-without-couple.decorator'
import { type CoupleContext, CurrentCouple } from './decorators/current-couple.decorator'
import { InviteService } from './invite.service'
import { UnlinkService } from './unlink.service'

// 초대 코드 무차별 대입 방지(architecture §4.3): 사용자당 5회/10분 + IP당 20회/시간
export const JOIN_USER_THROTTLE = { name: 'couple-join', ttl: 10 * 60_000, limit: 5 }
export const JOIN_IP_THROTTLE = { ttl: 60 * 60_000, limit: 20 }

@Controller('couples')
@Authenticated()
export class CouplesController {
  constructor(
    private readonly couples: CouplesService,
    private readonly invites: InviteService,
    private readonly unlinks: UnlinkService,
  ) {}

  @Post('invites')
  @AllowWithoutCouple()
  createInvite(@CurrentUser() me: AuthUser): Promise<CreateInviteResponse> {
    return this.invites.createInvite(me.id)
  }

  @Post('join')
  @AllowWithoutCouple()
  @Throttle({ default: JOIN_IP_THROTTLE })
  @UserThrottle(JOIN_USER_THROTTLE)
  join(
    @CurrentUser() me: AuthUser,
    @Body(new ZodValidationPipe(joinCoupleRequestSchema)) body: JoinCoupleRequest,
  ): Promise<Couple> {
    return this.invites.join(me.id, body.code)
  }

  @Get('me')
  getCouple(@CurrentCouple() couple: CoupleContext): Promise<Couple> {
    return this.couples.getCouple(couple.id)
  }

  @Patch('me')
  updateCouple(
    @CurrentCouple() couple: CoupleContext,
    @CurrentUser() me: AuthUser,
    @Body(new ZodValidationPipe(updateCoupleRequestSchema)) body: UpdateCoupleRequest,
  ): Promise<Couple> {
    return this.couples.updateStartedOn(couple.id, me.id, body)
  }

  @Post('me/unlink')
  @HttpCode(HttpStatus.OK)
  unlink(@CurrentCouple() couple: CoupleContext, @CurrentUser() me: AuthUser): Promise<Couple> {
    return this.unlinks.requestUnlink(couple.id, me.id)
  }

  @Post('me/reconnect')
  @HttpCode(HttpStatus.OK)
  @AllowDuringUnlinking()
  reconnect(@CurrentCouple() couple: CoupleContext, @CurrentUser() me: AuthUser): Promise<Couple> {
    return this.unlinks.reconnect(couple.id, me.id)
  }
}
