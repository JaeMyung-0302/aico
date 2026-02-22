import { prisma } from '../lib/prisma.js'
import { encrypt } from '../lib/crypto.js'
import * as portone from '../lib/portone.js'
import { randomUUID } from 'crypto'

const SUBSCRIPTION_PRICE = 2900
const SUBSCRIPTION_DAYS = 30

interface WebhookEvent {
  type: string
  data: { paymentId: string }
}

export const subscribe = async (groupId: string, payerId: string, billingKey: string) => {
  if (!portone.isAvailable()) {
    throw new Error('결제 서비스가 아직 설정되지 않았습니다.')
  }

  // 기존 ACTIVE 구독 확인
  const existing = await prisma.subscription.findFirst({
    where: { groupId, status: 'ACTIVE' },
  })

  if (existing) {
    throw new Error('이미 활성 구독이 있습니다.')
  }

  const now = new Date()
  const periodEnd = new Date(now.getTime() + SUBSCRIPTION_DAYS * 24 * 60 * 60 * 1000)
  const paymentId = `fridgemate_${randomUUID()}`

  // 포트원 결제 먼저 시도
  try {
    await portone.chargeBillingKey({
      billingKey,
      paymentId,
      amount: SUBSCRIPTION_PRICE,
      orderName: 'FridgeMate Premium 구독',
    })
  } catch (error) {
    // 결제 실패 → Payment 실패 기록만 남김
    await prisma.payment.create({
      data: {
        groupId,
        payerId,
        amount: SUBSCRIPTION_PRICE,
        status: 'FAILED',
        portonePaymentId: paymentId,
        failReason: error instanceof Error ? error.message : '결제 실패',
      },
    })

    throw new Error('결제에 실패했습니다. 다시 시도해주세요.')
  }

  // 결제 성공 → Subscription + Payment + Group 업데이트를 원자적으로 수행
  await prisma.$transaction([
    prisma.subscription.create({
      data: {
        groupId,
        billingKey: encrypt(billingKey),
        status: 'ACTIVE',
        currentPeriodEnd: periodEnd,
      },
    }),
    prisma.payment.create({
      data: {
        groupId,
        payerId,
        amount: SUBSCRIPTION_PRICE,
        status: 'PAID',
        portonePaymentId: paymentId,
        paidAt: now,
      },
    }),
    prisma.group.update({
      where: { id: groupId },
      data: { isPremium: true, premiumExpiresAt: periodEnd },
    }),
  ])

  return { success: true, currentPeriodEnd: periodEnd }
}

export const cancelSubscription = async (groupId: string) => {
  const subscription = await prisma.subscription.findFirst({
    where: { groupId, status: 'ACTIVE' },
  })

  if (!subscription) {
    throw new Error('활성 구독이 없습니다.')
  }

  const now = new Date()

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      status: 'CANCELLED',
      cancelledAt: now,
    },
  })

  // isPremium은 유지, premiumExpiresAt까지 사용 가능
  return {
    cancelledAt: now,
    premiumUntil: subscription.currentPeriodEnd,
  }
}

export const getStatus = async (groupId: string) => {
  const [subscription, group] = await Promise.all([
    prisma.subscription.findFirst({
      where: {
        groupId,
        status: { in: ['ACTIVE', 'CANCELLED'] },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.group.findUnique({
      where: { id: groupId },
      select: { isPremium: true },
    }),
  ])

  if (!subscription) {
    return {
      hasSubscription: false,
      status: null,
      currentPeriodEnd: null,
      isPremium: group?.isPremium ?? false,
    }
  }

  return {
    hasSubscription: true,
    status: subscription.status,
    currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
    isPremium: group?.isPremium ?? false,
  }
}

export const handleWebhook = async (body: string, headers: Record<string, string>) => {
  const webhook = await portone.verifyWebhook(body, headers)
  const event = webhook as WebhookEvent

  if (event.type === 'Transaction.Paid') {
    await handlePaymentPaid(event.data.paymentId)
  } else if (event.type === 'Transaction.Failed') {
    await handlePaymentFailed(event.data.paymentId)
  }

  return { received: true }
}

const handlePaymentPaid = async (portonePaymentId: string) => {
  const payment = await prisma.payment.findFirst({
    where: { portonePaymentId },
    include: { subscription: true },
  })

  if (!payment) {
    return
  }

  // 멱등성: 이미 PAID면 스킵
  if (payment.status === 'PAID') {
    return
  }

  // 포트원 API로 이중 검증 (상태 + 금액)
  const portonePayment = await portone.getPayment(portonePaymentId)
  if (portonePayment.status !== 'PAID') {
    return
  }

  if (portonePayment.amount !== payment.amount) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'FAILED', failReason: '결제 금액 불일치' },
    })
    return
  }

  const periodEnd = payment.subscription?.currentPeriodEnd ?? new Date()

  await prisma.$transaction([
    prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'PAID', paidAt: new Date() },
    }),
    prisma.group.update({
      where: { id: payment.groupId },
      data: { isPremium: true, premiumExpiresAt: periodEnd },
    }),
  ])
}

const handlePaymentFailed = async (portonePaymentId: string) => {
  const payment = await prisma.payment.findFirst({
    where: { portonePaymentId },
  })

  if (!payment || !payment.subscriptionId) {
    return
  }

  await prisma.$transaction([
    prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'FAILED', failReason: 'Webhook 결제 실패 알림' },
    }),
    prisma.subscription.update({
      where: { id: payment.subscriptionId },
      data: { status: 'EXPIRED' },
    }),
  ])
}
