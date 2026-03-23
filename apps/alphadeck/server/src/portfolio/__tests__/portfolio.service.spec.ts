import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { PortfolioService } from '../portfolio.service';
import { PrismaService } from '../../prisma/prisma.service';

const mockPortfolio = {
  id: 1,
  userId: 1,
  name: '기본 포트폴리오',
  isDefault: true,
  items: [],
};

const mockPrisma = {
  portfolio: {
    findFirst: jest.fn().mockResolvedValue(mockPortfolio),
    create: jest.fn().mockResolvedValue(mockPortfolio),
    findMany: jest.fn().mockResolvedValue([mockPortfolio]),
    delete: jest.fn().mockResolvedValue(mockPortfolio),
  },
  portfolioItem: {
    create: jest.fn().mockResolvedValue({ id: 1, symbol: 'AAPL', quantity: 10, avgBuyPrice: 150 }),
    count: jest.fn().mockResolvedValue(0),
    delete: jest.fn().mockResolvedValue({}),
  },
  user: {
    findUnique: jest.fn().mockResolvedValue({ id: 1, plan: 'FREE' }),
  },
};

describe('PortfolioService', () => {
  let service: PortfolioService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PortfolioService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<PortfolioService>(PortfolioService);
    jest.clearAllMocks();
  });

  describe('getPortfolios', () => {
    it('사용자의 포트폴리오 목록을 반환해야 한다', async () => {
      const result = await service.getPortfolios(1);
      expect(mockPrisma.portfolio.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 1 } }),
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('addItem', () => {
    it('종목을 추가해야 한다', async () => {
      mockPrisma.portfolio.findFirst.mockResolvedValueOnce(mockPortfolio);
      mockPrisma.portfolioItem.count.mockResolvedValueOnce(0);
      mockPrisma.user.findUnique.mockResolvedValueOnce({ id: 1, plan: 'FREE' });

      const result = await service.addItem(1, 1, 'AAPL', 10, 150);
      expect(result.symbol).toBe('AAPL');
    });

    it('Free 플랜에서 3종목 초과 시 에러를 던져야 한다', async () => {
      mockPrisma.portfolio.findFirst.mockResolvedValueOnce(mockPortfolio);
      mockPrisma.portfolioItem.count.mockResolvedValueOnce(3);
      mockPrisma.user.findUnique.mockResolvedValueOnce({ id: 1, plan: 'FREE' });

      await expect(
        service.addItem(1, 1, 'NVDA', 5, 200),
      ).rejects.toThrow(ForbiddenException);
    });

    it('Pro 플랜은 3종목 초과해도 추가 가능해야 한다', async () => {
      mockPrisma.portfolio.findFirst.mockResolvedValueOnce(mockPortfolio);
      mockPrisma.portfolioItem.count.mockResolvedValueOnce(10);
      mockPrisma.user.findUnique.mockResolvedValueOnce({ id: 1, plan: 'PRO' });

      const result = await service.addItem(1, 1, 'NVDA', 5, 200);
      expect(result.symbol).toBe('AAPL');
    });
  });
});
