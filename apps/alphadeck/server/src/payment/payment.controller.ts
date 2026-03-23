import { Controller, Post, Body, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AuthenticatedRequest } from '../common/interfaces/authenticated-request';
import { IsEnum, IsString } from 'class-validator';
import { Plan } from '../generated/prisma';

class SubscribeDto {
  @IsEnum(['PRO', 'MAX'])
  plan!: 'PRO' | 'MAX';

  @IsString()
  paymentId!: string;
}

@Controller('payment')
@UseGuards(AuthGuard)
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('subscribe')
  async subscribe(
    @Req() req: AuthenticatedRequest,
    @Body() dto: SubscribeDto,
  ) {
    const isVerified = await this.paymentService.verifyPayment(dto.paymentId, dto.plan);
    if (!isVerified) {
      throw new ForbiddenException('결제 검증에 실패했습니다');
    }

    return this.paymentService.upgradePlan(req.user.id, dto.plan);
  }

  @Post('cancel')
  cancel(@Req() req: AuthenticatedRequest) {
    return this.paymentService.downgradeToFree(req.user.id);
  }
}
