import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Plan } from '../generated/prisma';

const PLAN_PRICES: Record<string, number> = {
  PRO: 9900,
  MAX: 29900,
};

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(private readonly prisma: PrismaService) {}

  async verifyPayment(paymentId: string, plan: string): Promise<boolean> {
    // TODO: PortOne API 연동 후 실제 결제 검증으로 교체
    // 현재는 paymentId 존재 여부만 확인 (MVP 단계)
    if (!paymentId || paymentId.trim().length === 0) {
      this.logger.warn(`Empty paymentId for plan ${plan}`);
      return false;
    }

    const expectedAmount = PLAN_PRICES[plan];
    if (!expectedAmount) {
      this.logger.warn(`Invalid plan: ${plan}`);
      return false;
    }

    // TODO: 실제 PortOne 검증
    // const payment = await portone.getPayment(paymentId);
    // if (payment.status !== 'PAID' || payment.amount !== expectedAmount) return false;

    this.logger.log(`Payment ${paymentId} verified for plan ${plan} (MVP: skip portone)`);
    return true;
  }

  async upgradePlan(userId: number, plan: Plan) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { plan },
      select: { id: true, email: true, plan: true },
    });

    this.logger.log(`User ${userId} upgraded to ${plan}`);
    return user;
  }

  async downgradeToFree(userId: number) {
    return this.upgradePlan(userId, 'FREE');
  }
}
