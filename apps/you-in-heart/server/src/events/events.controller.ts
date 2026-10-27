import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common'
import { type TrackEventRequest, trackEventRequestSchema } from '@you-in-heart/shared'
import { Authenticated } from '../auth/decorators/authenticated.decorator'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import type { AuthUser } from '../auth/guards/jwt-auth.guard'
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe'
import { AllowWithoutCouple } from '../couples/decorators/allow-without-couple.decorator'
import { EventsService, SERVER_ONLY_EVENT_NAMES } from './events.service'

const clientEventSchema = trackEventRequestSchema.refine((body) => !SERVER_ONLY_EVENT_NAMES.has(body.name), {
  message: '서버에서만 기록하는 이벤트입니다',
  path: ['name'],
})

// 페어링 전(app_open)·유예 중에도 받는다
@Controller('events')
@Authenticated()
@AllowWithoutCouple()
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Post()
  @HttpCode(HttpStatus.NO_CONTENT)
  track(
    @CurrentUser() me: AuthUser,
    @Body(new ZodValidationPipe(clientEventSchema)) body: TrackEventRequest,
  ): Promise<void> {
    return this.events.track(me.id, body)
  }
}
