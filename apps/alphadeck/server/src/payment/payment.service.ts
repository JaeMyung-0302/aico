import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Plan } from '../generated/prisma';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(private readonly prisma: PrismaService) {}

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
