import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { PrismaService } from '../prisma/prisma.service'
import { PortoneService } from '../portone/portone.service'
import { decrypt } from '../common/utils/crypto'
import { randomUUID } from 'crypto'
import {
  SUBSCRIPTION_PRICE,
  SUBSCRIPTION_DAYS,
  MAX_RETRY_COUNT,
} from './constants'

@Injectable()
export class RenewalService {
  private readonly logger = new Logger(RenewalService.name)
  private isRunning = false

  constructor(
    private readonly prisma: PrismaService,
    private readonly portoneService: PortoneService,
  ) {}

  // KST 매일 자정 실행 (데코레이터는 메서드 문법 필요)
  @Cron('0 0 * * *', { name: 'subscription-renewal', timeZone: 'Asia/Seoul' })
  async handleRenewals() {
    if (this.isRunning) {
      this.logger.warn('이전 갱신 작업 진행 중 — 스킵')
      return
    }

    if (!this.portoneService.isAvailable()) {
      this.logger.warn('포트원 미설정 — 갱신 스킵')
      return
    }

    this.isRunning = true
    try {
      this.logger.log('구독 갱신 Cron 시작')
      await this.processActiveRenewals()
      await this.processPastDueRetries()
      this.logger.log('구독 갱신 Cron 완료')
    } finally {
      this.isRunning = false
    }
  }

  // ACTIVE 구독 중 만기 도래한 것 갱신
  private processActiveRenewals = async () => {
    const now = new Date()
    const subscriptions = await this.prisma.subscription.findMany({
      where: { status: 'ACTIVE', currentPeriodEnd: { lte: now } },
      select: {
        id: true,
        userId: true,
        billingKey: true,
        currentPeriodEnd: true,
        retryCount: true,
      },
    })

    this.logger.log(`갱신 대상 ACTIVE 구독: ${subscriptions.length}건`)

    for (const sub of subscriptions) {
      await this.renewSubscription(
        sub.id,
        sub.userId,
        sub.billingKey,
        sub.currentPeriodEnd,
        sub.retryCount,
      )
    }
  }

  // PAST_DUE 구독 중 재시도 가능한 것 처리
  private processPastDueRetries = async () => {
    const subscriptions = await this.prisma.subscription.findMany({
      where: { status: 'PAST_DUE', retryCount: { lt: MAX_RETRY_COUNT } },
      select: {
        id: true,
        userId: true,
        billingKey: true,
        currentPeriodEnd: true,
        retryCount: true,
      },
    })

    this.logger.log(`재시도 대상 PAST_DUE 구독: ${subscriptions.length}건`)

    for (const sub of subscriptions) {
      await this.renewSubscription(
        sub.id,
        sub.userId,
        sub.billingKey,
        sub.currentPeriodEnd,
        sub.retryCount,
      )
    }
  }

  // 개별 구독 갱신 처리 (한 건 실패가 다른 건에 영향 없음)
  private renewSubscription = async (
    subscriptionId: string,
    userId: string,
    encryptedBillingKey: string,
    currentPeriodEnd: Date,
    retryCount: number,
  ) => {
    const paymentId = `cooksnap_renewal_${randomUUID()}`

    try {
      const billingKey = decrypt(encryptedBillingKey)

      await this.portoneService.chargeBillingKey({
        billingKey,
        paymentId,
        amount: SUBSCRIPTION_PRICE,
        orderName: 'CookSnap Premium 구독 갱신',
      })

      // 결제 성공: 기존 만료일 기준 30일 연장 (누적 밀림 방지)
      const newPeriodEnd = new Date(
        currentPeriodEnd.getTime() + SUBSCRIPTION_DAYS * 24 * 60 * 60 * 1000,
      )

      await this.prisma.$transaction([
        this.prisma.subscription.update({
          where: { id: subscriptionId },
          data: {
            status: 'ACTIVE',
            currentPeriodEnd: newPeriodEnd,
            retryCount: 0,
          },
        }),
        this.prisma.payment.create({
          data: {
            userId,
            subscriptionId,
            amount: SUBSCRIPTION_PRICE,
            status: 'PAID',
            portonePaymentId: paymentId,
            paidAt: new Date(),
          },
        }),
        this.prisma.user.update({
          where: { id: userId },
          data: { isPremium: true, premiumExpiresAt: newPeriodEnd },
        }),
      ])

      this.logger.log(`갱신 성공: subscription=${subscriptionId}`)
    } catch (error) {
      // 민감 정보 노출 방지: error 객체 전체를 로깅하지 않음
      const errorCode =
        error instanceof Error ? error.message.slice(0, 100) : 'UNKNOWN'
      this.logger.error(
        `갱신 실패: subscription=${subscriptionId}, code=${errorCode}`,
      )

      try {
        const nextRetryCount = retryCount + 1
        const isExpired = nextRetryCount >= MAX_RETRY_COUNT

        // PAST_DUE: premiumExpiresAt 1일 연장 (Premium 유지)
        // EXPIRED: isPremium = false (Premium 비활성화)
        const graceExtension = new Date(Date.now() + 24 * 60 * 60 * 1000)

        await this.prisma.$transaction([
          this.prisma.subscription.update({
            where: { id: subscriptionId },
            data: {
              status: isExpired ? 'EXPIRED' : 'PAST_DUE',
              retryCount: nextRetryCount,
            },
          }),
          this.prisma.payment.create({
            data: {
              userId,
              subscriptionId,
              amount: SUBSCRIPTION_PRICE,
              status: 'FAILED',
              portonePaymentId: paymentId,
              failReason: errorCode,
            },
          }),
          this.prisma.user.update({
            where: { id: userId },
            data: isExpired
              ? { isPremium: false, premiumExpiresAt: null }
              : { premiumExpiresAt: graceExtension },
          }),
        ])

        if (isExpired) {
          this.logger.warn(
            `구독 만료: subscription=${subscriptionId} (${MAX_RETRY_COUNT}회 실패)`,
          )
        }
      } catch (dbError) {
        const dbErrorCode =
          dbError instanceof Error ? dbError.message.slice(0, 100) : 'UNKNOWN'
        this.logger.error(
          `갱신 실패 기록 중 에러: subscription=${subscriptionId}, code=${dbErrorCode}`,
        )
      }
    }
  }
}
