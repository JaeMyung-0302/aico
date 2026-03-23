import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  Headers,
  RawBody,
} from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { PaymentService } from './payment.service'
import { AuthGuard } from '../auth/guards/auth.guard'
import { SubscribeDto } from './dto/subscribe.dto'
import type { AuthenticatedRequest } from '../common/interfaces/authenticated-request'

@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('subscribe')
  @UseGuards(AuthGuard)
  subscribe(@Req() req: AuthenticatedRequest, @Body() dto: SubscribeDto) {
    return this.paymentService.subscribe(req.user.id, dto.billingKey)
  }

  @Post('cancel')
  @UseGuards(AuthGuard)
  cancel(@Req() req: AuthenticatedRequest) {
    return this.paymentService.cancelSubscription(req.user.id)
  }

  @Get('status')
  @UseGuards(AuthGuard)
  getStatus(@Req() req: AuthenticatedRequest) {
    return this.paymentService.getStatus(req.user.id)
  }

  @Throttle({ default: { limit: 100, ttl: 60000 } })
  @Post('webhook')
  handleWebhook(
    @Headers() headers: Record<string, string>,
    @RawBody() body: Buffer,
  ) {
    return this.paymentService.handleWebhook(body.toString(), headers)
  }
}
