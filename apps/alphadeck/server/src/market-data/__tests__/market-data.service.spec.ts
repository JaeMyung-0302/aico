import { Test, TestingModule } from '@nestjs/testing';
import { MarketDataService } from '../market-data.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PriceDataRow } from '../interfaces/market-data-provider.interface';

const mockPrices: PriceDataRow[] = [
  { date: new Date('2024-01-02'), open: 150, high: 155, low: 149, close: 153, volume: 1000000 },
  { date: new Date('2024-01-03'), open: 153, high: 158, low: 152, close: 157, volume: 1200000 },
  { date: new Date('2024-01-04'), open: 157, high: 160, low: 155, close: 159, volume: 900000 },
];

const mockYahooProvider = {
  fetchHistorical: jest.fn().mockResolvedValue(mockPrices),
};

const mockPrismaService = {
  priceData: {
    upsert: jest.fn().mockResolvedValue({}),
    findMany: jest.fn().mockResolvedValue([]),
  },
};

describe('MarketDataService', () => {
  let service: MarketDataService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketDataService,
        { provide: 'YAHOO_PROVIDER', useValue: mockYahooProvider },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<MarketDataService>(MarketDataService);
    jest.clearAllMocks();
  });

  describe('fetchAndStore', () => {
    it('Yahoo에서 데이터를 가져와 DB에 저장해야 한다', async () => {
      const result = await service.fetchAndStore('AAPL');

      expect(mockYahooProvider.fetchHistorical).toHaveBeenCalledWith('AAPL', 200);
      expect(mockPrismaService.priceData.upsert).toHaveBeenCalledTimes(3);
      expect(result).toHaveLength(3);
    });

    it('upsert에서 symbol+date를 unique key로 사용해야 한다', async () => {
      await service.fetchAndStore('AAPL');

      const firstCall = mockPrismaService.priceData.upsert.mock.calls[0][0];
      expect(firstCall.where).toHaveProperty('symbol_date');
      expect(firstCall.where.symbol_date.symbol).toBe('AAPL');
    });
  });

  describe('cache', () => {
    it('두 번째 호출은 캐시에서 반환해야 한다', async () => {
      await service.fetchAndStore('AAPL');
      const cached = await service.fetchAndStore('AAPL');

      expect(mockYahooProvider.fetchHistorical).toHaveBeenCalledTimes(1);
      expect(cached).toHaveLength(3);
    });

    it('다른 종목은 별도로 fetch해야 한다', async () => {
      await service.fetchAndStore('AAPL');
      await service.fetchAndStore('TSLA');

      expect(mockYahooProvider.fetchHistorical).toHaveBeenCalledTimes(2);
    });
  });

  describe('getPrices', () => {
    it('캐시에 있으면 캐시에서 반환해야 한다', async () => {
      await service.fetchAndStore('AAPL');
      const result = await service.getPrices('AAPL');

      expect(result).toHaveLength(3);
      expect(mockPrismaService.priceData.findMany).not.toHaveBeenCalled();
    });

    it('캐시에 없으면 DB에서 조회해야 한다', async () => {
      mockPrismaService.priceData.findMany.mockResolvedValueOnce(mockPrices);
      const result = await service.getPrices('NVDA');

      expect(mockPrismaService.priceData.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { symbol: 'NVDA' },
        }),
      );
      expect(result).toHaveLength(3);
    });
  });
});
