import { Test, TestingModule } from '@nestjs/testing'
import { PremiumService } from './premium.service'
import { PrismaService } from '../prisma/prisma.service'

describe('PremiumService', () => {
  let service: PremiumService
  let prisma: {
    user: Record<string, jest.Mock>
    dailyUsage: Record<string, jest.Mock>
  }

  beforeEach(async () => {
    const mockPrisma = {
      user: { findUnique: jest.fn() },
      dailyUsage: { findUnique: jest.fn(), upsert: jest.fn() },
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PremiumService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile()

    service = module.get<PremiumService>(PremiumService)
    prisma = module.get(PrismaService) as typeof prisma
  })

  describe('isPremiumActive', () => {
    it('isPremium: false → false', () => {
      expect(
        service.isPremiumActive({ isPremium: false, premiumExpiresAt: null }),
      ).toBe(false)
    })

    it('isPremium: true, 만료일 없음 → true (영구)', () => {
      expect(
        service.isPremiumActive({ isPremium: true, premiumExpiresAt: null }),
      ).toBe(true)
    })

    it('isPremium: true, 만료일 미래 → true', () => {
      expect(
        service.isPremiumActive({
          isPremium: true,
          premiumExpiresAt: new Date(Date.now() + 86400_000),
        }),
      ).toBe(true)
    })

    it('isPremium: true, 만료일 과거 → false', () => {
      expect(
        service.isPremiumActive({
          isPremium: true,
          premiumExpiresAt: new Date(Date.now() - 1000),
        }),
      ).toBe(false)
    })
  })

  describe('getQuota', () => {
    it('사용자 없으면 allowed: false, remaining: 0', async () => {
      prisma.user.findUnique.mockResolvedValue(null)

      const result = await service.getQuota('u-1')

      expect(result).toEqual({ allowed: false, remaining: 0, isPremium: false })
    })

    it('프리미엄 활성 → allowed: true, remaining: -1', async () => {
      prisma.user.findUnique.mockResolvedValue({
        isPremium: true,
        premiumExpiresAt: new Date(Date.now() + 86400_000),
      })

      const result = await service.getQuota('u-1')

      expect(result).toEqual({ allowed: true, remaining: -1, isPremium: true })
      // 프리미엄이면 dailyUsage 조회 안 함
      expect(prisma.dailyUsage.findUnique).not.toHaveBeenCalled()
    })

    it('무료 사용자, 오늘 사용 0회 → allowed: true, remaining: 1', async () => {
      prisma.user.findUnique.mockResolvedValue({
        isPremium: false,
        premiumExpiresAt: null,
      })
      prisma.dailyUsage.findUnique.mockResolvedValue(null)

      const result = await service.getQuota('u-1')

      expect(result).toEqual({ allowed: true, remaining: 1, isPremium: false })
    })

    it('무료 사용자, 오늘 1회 이상 사용 → allowed: false, remaining: 0', async () => {
      prisma.user.findUnique.mockResolvedValue({
        isPremium: false,
        premiumExpiresAt: null,
      })
      prisma.dailyUsage.findUnique.mockResolvedValue({ count: 1 })

      const result = await service.getQuota('u-1')

      expect(result).toEqual({ allowed: false, remaining: 0, isPremium: false })
    })
  })

  describe('incrementUsage', () => {
    it('upsert 호출: 새 날짜면 count: 1로 create', async () => {
      prisma.dailyUsage.upsert.mockResolvedValue({})

      await service.incrementUsage('u-1')

      const call = prisma.dailyUsage.upsert.mock.calls[0][0]
      expect(call.create.count).toBe(1)
      expect(call.update.count).toEqual({ increment: 1 })
    })

    it('upsert 실패 시 throw 없음 (warn만)', async () => {
      prisma.dailyUsage.upsert.mockRejectedValue(new Error('DB down'))

      await expect(service.incrementUsage('u-1')).resolves.toBeUndefined()
    })
  })
})
