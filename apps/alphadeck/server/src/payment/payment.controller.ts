import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AuthenticatedRequest } from '../common/interfaces/authenticated-request';
import { Plan } from '../generated/prisma';

@Controller('payment')
@UseGuards(AuthGuard)
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('subscribe')
  subscribe(
    @Req() req: AuthenticatedRequest,
    @Body('plan') plan: Plan,
  ) {
    return this.paymentService.upgradePlan(req.user.id, plan);
  }

  @Post('cancel')
  cancel(@Req() req: AuthenticatedRequest) {
    return this.paymentService.downgradeToFree(req.user.id);
  }
}
