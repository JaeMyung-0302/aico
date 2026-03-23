import { Test, TestingModule } from '@nestjs/testing';
import { AnalysisService } from '../analysis.service';
import { MarketDataService } from '../../market-data/market-data.service';
import { TaEngineService } from '../../ta-engine/ta-engine.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PriceDataRow } from '../../market-data/interfaces/market-data-provider.interface';

const mockPrices: PriceDataRow[] = Array.from({ length: 210 }, (_, i) => ({
  date: new Date(`2024-01-${String(i + 1).padStart(2, '0')}`),
  open: 150 + Math.sin(i / 10) * 10,
  high: 155 + Math.sin(i / 10) * 10,
  low: 145 + Math.sin(i / 10) * 10,
  close: 152 + Math.sin(i / 10) * 10 + i * 0.1,
  volume: 1000000 + Math.sin(i / 5) * 500000,
}));

const mockMarketDataService = {
  fetchAndStore: jest.fn().mockResolvedValue(mockPrices),
  getPrices: jest.fn().mockResolvedValue(mockPrices),
};

const mockPrismaService = {
  taResult: {
    upsert: jest.fn().mockResolvedValue({}),
  },
};

describe('AnalysisService', () => {
  let service: AnalysisService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalysisService,
        TaEngineService,
        { provide: MarketDataService, useValue: mockMarketDataService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AnalysisService>(AnalysisService);
    jest.clearAllMocks();
  });

  describe('analyzeSymbol', () => {
    it('종목 분석 결과를 반환해야 한다', async () => {
      const result = await service.analyzeSymbol('AAPL');

      expect(result).toHaveProperty('symbol', 'AAPL');
      expect(result).toHaveProperty('taResult');
      expect(result).toHaveProperty('signalScore');
      expect(result).toHaveProperty('prices');
    });

    it('taResult에 6개 지표가 포함되어야 한다', async () => {
      const result = await service.analyzeSymbol('AAPL');

      expect(result.taResult).toHaveProperty('rsi14');
      expect(result.taResult).toHaveProperty('macdLine');
      expect(result.taResult).toHaveProperty('bbUpper');
      expect(result.taResult).toHaveProperty('sma200');
    });

    it('signalScore가 -100~+100 범위여야 한다', async () => {
      const result = await service.analyzeSymbol('AAPL');

      expect(result.signalScore.score).toBeGreaterThanOrEqual(-100);
      expect(result.signalScore.score).toBeLessThanOrEqual(100);
    });

    it('결과를 DB에 저장해야 한다', async () => {
      await service.analyzeSymbol('AAPL');

      expect(mockPrismaService.taResult.upsert).toHaveBeenCalled();
    });

    it('최근 60일 가격 데이터를 포함해야 한다', async () => {
      const result = await service.analyzeSymbol('AAPL');

      expect(result.prices.length).toBeLessThanOrEqual(60);
      expect(result.prices.length).toBeGreaterThan(0);
    });
  });
});
