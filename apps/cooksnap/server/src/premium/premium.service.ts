import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

const FREE_DAILY_LIMIT = 1

// KST 기준 오늘 날짜 (YYYY-MM-DD)
const getTodayKST = (): Date => {
  const now = new Date()
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  const dateStr = kst.toISOString().split('T')[0] as string
  return new Date(`${dateStr}T00:00:00.000Z`)
}

@Injectable()
export class PremiumService {
  private readonly logger = new Logger(PremiumService.name)

  constructor(private readonly prisma: PrismaService) {}

  // 프리미엄 활성 여부 확인
  isPremiumActive = (user: {
    isPremium: boolean
    premiumExpiresAt: Date | null
  }): boolean => {
    if (!user.isPremium) return false
    if (!user.premiumExpiresAt) return true // 만료일 없으면 영구
    return user.premiumExpiresAt > new Date()
  }

  // 오늘 분석 쿼터 조회
  getQuota = async (
    userId: string,
  ): Promise<{ allowed: boolean; remaining: number; isPremium: boolean }> => {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isPremium: true, premiumExpiresAt: true },
    })

    if (!user) {
      return { allowed: false, remaining: 0, isPremium: false }
    }

    if (this.isPremiumActive(user)) {
      return { allowed: true, remaining: -1, isPremium: true }
    }

    const today = getTodayKST()
    const record = await this.prisma.dailyUsage.findUnique({
      where: { userId_date: { userId, date: today } },
      select: { count: true },
    })

    const currentCount = record?.count || 0
    const remaining = FREE_DAILY_LIMIT - currentCount

    return {
      allowed: remaining > 0,
      remaining: Math.max(remaining, 0),
      isPremium: false,
    }
  }

  // 일일 사용량 증가 (새 분석 성공 시에만 호출)
  incrementUsage = async (userId: string): Promise<void> => {
    const today = getTodayKST()

    try {
      await this.prisma.dailyUsage.upsert({
        where: { userId_date: { userId, date: today } },
        update: { count: { increment: 1 } },
        create: { userId, date: today, count: 1 },
      })
    } catch (error) {
      this.logger.warn(`일일 사용량 기록 실패: ${error}`)
    }
  }
}
