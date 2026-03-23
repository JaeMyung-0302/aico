import { YahooProvider } from '../providers/yahoo.provider';

jest.mock('yahoo-finance2', () => ({
  __esModule: true,
  default: {
    chart: jest.fn(),
    suppressNotices: jest.fn(),
  },
}));

import yahooFinance from 'yahoo-finance2';

const mockChart = yahooFinance.chart as jest.MockedFunction<typeof yahooFinance.chart>;

describe('YahooProvider', () => {
  let provider: YahooProvider;

  beforeEach(() => {
    provider = new YahooProvider(10000);
    jest.clearAllMocks();
  });

  describe('fetchHistorical', () => {
    it('yahoo-finance2 chart를 올바른 파라미터로 호출해야 한다', async () => {
      mockChart.mockResolvedValueOnce({
        quotes: [
          { date: new Date('2024-01-02'), open: 150, high: 155, low: 149, close: 153, volume: 1000000 },
        ],
      } as any);

      const result = await provider.fetchHistorical('AAPL', 200);

      expect(mockChart).toHaveBeenCalledWith(
        'AAPL',
        expect.objectContaining({
          period1: expect.any(Date),
          interval: '1d',
        }),
      );
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          open: 150,
          close: 153,
          volume: 1000000,
        }),
      );
    });

    it('실패 시 3회까지 재시도해야 한다', async () => {
      mockChart
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          quotes: [
            { date: new Date('2024-01-02'), open: 150, high: 155, low: 149, close: 153, volume: 1000000 },
          ],
        } as any);

      const result = await provider.fetchHistorical('AAPL', 200);

      expect(mockChart).toHaveBeenCalledTimes(3);
      expect(result).toHaveLength(1);
    });

    it('3회 모두 실패하면 에러를 던져야 한다', async () => {
      mockChart
        .mockRejectedValueOnce(new Error('fail'))
        .mockRejectedValueOnce(new Error('fail'))
        .mockRejectedValueOnce(new Error('fail'));

      await expect(provider.fetchHistorical('AAPL', 200)).rejects.toThrow();
      expect(mockChart).toHaveBeenCalledTimes(3);
    });

    it('PriceDataRow 형태로 변환해야 한다', async () => {
      mockChart.mockResolvedValueOnce({
        quotes: [
          { date: new Date('2024-01-02'), open: 150.5, high: 155.3, low: 149.2, close: 153.8, volume: 1000000 },
        ],
      } as any);

      const result = await provider.fetchHistorical('AAPL', 1);

      expect(result[0]).toHaveProperty('date');
      expect(result[0]).toHaveProperty('open');
      expect(result[0]).toHaveProperty('high');
      expect(result[0]).toHaveProperty('low');
      expect(result[0]).toHaveProperty('close');
      expect(result[0]).toHaveProperty('volume');
    });
  });
});
