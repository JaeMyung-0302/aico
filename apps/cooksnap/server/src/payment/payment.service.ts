import {
  Injectable,
  Logger,
  ConflictException,
  ServiceUnavailableException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PortoneService } from '../portone/portone.service';
import { randomUUID } from 'crypto';
import { encrypt } from '../common/utils/crypto';
import { SUBSCRIPTION_PRICE, SUBSCRIPTION_DAYS } from './constants';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly portoneService: PortoneService,
  ) {}

  subscribe = async (userId: string, billingKey: string) => {
    if (!this.portoneService.isAvailable()) {
      throw new ServiceUnavailableException('결제 서비스가 아직 설정되지 않았습니다.');
    }

    // 기존 ACTIVE 구독 확인
    const existing = await this.prisma.subscription.findFirst({
      where: { userId, status: 'ACTIVE' },
    });

    if (existing) {
      throw new ConflictException('이미 활성 구독이 있습니다.');
    }

    const now = new Date();
    const periodEnd = new Date(now.getTime() + SUBSCRIPTION_DAYS * 24 * 60 * 60 * 1000);

    // Subscription 생성 (billingKey 암호화 저장)
    const subscription = await this.prisma.subscription.create({
      data: {
        userId,
        billingKey: encrypt(billingKey),
        status: 'ACTIVE',
        currentPeriodEnd: periodEnd,
      },
    });

    // 포트원 결제
    const paymentId = `cooksnap_${randomUUID()}`;

    try {
      await this.portoneService.chargeBillingKey({
        billingKey,
        paymentId,
        amount: SUBSCRIPTION_PRICE,
        orderName: 'CookSnap Premium 구독',
      });

      // 결제 성공 → Payment 기록 + 프리미엄 활성화
      await this.prisma.$transaction([
        this.prisma.payment.create({
          data: {
            userId,
            subscriptionId: subscription.id,
            amount: SUBSCRIPTION_PRICE,
            status: 'PAID',
            portonePaymentId: paymentId,
            paidAt: new Date(),
          },
        }),
        this.prisma.user.update({
          where: { id: userId },
          data: { isPremium: true, premiumExpiresAt: periodEnd },
        }),
      ]);

      return { success: true, currentPeriodEnd: periodEnd };
    } catch (error) {
      const errorCode = error instanceof Error ? error.message.slice(0, 100) : 'UNKNOWN';
      this.logger.error(`결제 실패: code=${errorCode}`);

      // 결제 실패 → Subscription 만료 + Payment 기록
      await this.prisma.$transaction([
        this.prisma.subscription.update({
          where: { id: subscription.id },
          data: { status: 'EXPIRED' },
        }),
        this.prisma.payment.create({
          data: {
            userId,
            subscriptionId: subscription.id,
            amount: SUBSCRIPTION_PRICE,
            status: 'FAILED',
            portonePaymentId: paymentId,
            failReason: error instanceof Error ? error.message : '결제 실패',
          },
        }),
      ]);

      throw new ServiceUnavailableException('결제에 실패했습니다. 다시 시도해주세요.');
    }
  };

  cancelSubscription = async (userId: string) => {
    const subscription = await this.prisma.subscription.findFirst({
      where: { userId, status: { in: ['ACTIVE', 'PAST_DUE'] } },
    });

    if (!subscription) {
      throw new NotFoundException('활성 구독이 없습니다.');
    }

    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
      },
    });

    // isPremium은 유지, premiumExpiresAt까지 사용 가능
    return {
      cancelledAt: new Date(),
      premiumUntil: subscription.currentPeriodEnd,
    };
  };

  getStatus = async (userId: string) => {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        userId,
        status: { in: ['ACTIVE', 'CANCELLED', 'PAST_DUE'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!subscription) {
      return {
        hasSubscription: false,
        status: null,
        currentPeriodEnd: null,
      };
    }

    return {
      hasSubscription: true,
      status: subscription.status,
      currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
    };
  };

  handleWebhook = async (body: string, headers: Record<string, string>) => {
    // 1. 서명 검증
    const webhook = await this.portoneService.verifyWebhook(body, headers);

    // 2. 결제 완료 처리
    if (webhook.type === 'Transaction.Paid') {
      await this.handlePaymentPaid(webhook.data.paymentId);
    }

    // 3. 결제 실패 처리
    if (webhook.type === 'Transaction.Failed') {
      await this.handlePaymentFailed(webhook.data.paymentId);
    }

    return { received: true };
  };

  private handlePaymentPaid = async (portonePaymentId: string) => {
    const payment = await this.prisma.payment.findFirst({
      where: { portonePaymentId },
      include: { subscription: true },
    });

    if (!payment) {
      this.logger.warn(`결제 기록을 찾을 수 없습니다: ${portonePaymentId}`);
      return;
    }

    // 멱등성: 이미 PAID면 스킵
    if (payment.status === 'PAID') {
      this.logger.log(`이미 처리된 결제: ${portonePaymentId}`);
      return;
    }

    // 포트원 API로 이중 검증
    const portonePayment = await this.portoneService.getPayment(portonePaymentId);
    if (portonePayment.status !== 'PAID') {
      this.logger.warn(`포트원 결제 상태 불일치: ${portonePayment.status}`);
      return;
    }

    const periodEnd = payment.subscription?.currentPeriodEnd ?? new Date();

    await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'PAID', paidAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: payment.userId },
        data: { isPremium: true, premiumExpiresAt: periodEnd },
      }),
    ]);

    this.logger.log(`결제 확인 완료: ${portonePaymentId}`);
  };

  private handlePaymentFailed = async (portonePaymentId: string) => {
    const payment = await this.prisma.payment.findFirst({
      where: { portonePaymentId },
    });

    if (!payment) {
      this.logger.warn(`결제 기록을 찾을 수 없습니다: ${portonePaymentId}`);
      return;
    }

    await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'FAILED', failReason: 'Webhook 결제 실패 알림' },
      }),
      this.prisma.subscription.updateMany({
        where: { id: payment.subscriptionId ?? undefined },
        data: { status: 'EXPIRED' },
      }),
    ]);

    this.logger.log(`결제 실패 처리 완료: ${portonePaymentId}`);
  };
}
