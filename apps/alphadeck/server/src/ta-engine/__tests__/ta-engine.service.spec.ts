import { TaEngineService } from '../ta-engine.service';

describe('TaEngineService', () => {
  const service = new TaEngineService();

  // 충분한 데이터 (200+ 종가)
  const prices = Array.from({ length: 210 }, (_, i) =>
    150 + Math.sin(i / 10) * 20 + i * 0.1,
  );
  const volumes = Array.from({ length: 210 }, (_, i) =>
    1000000 + Math.sin(i / 5) * 500000,
  );

  it('6개 지표 결과를 모두 포함해야 한다', () => {
    const result = service.calculateAll(prices, volumes);

    expect(result).toHaveProperty('sma20');
    expect(result).toHaveProperty('sma50');
    expect(result).toHaveProperty('sma200');
    expect(result).toHaveProperty('ema12');
    expect(result).toHaveProperty('ema26');
    expect(result).toHaveProperty('rsi14');
    expect(result).toHaveProperty('macdLine');
    expect(result).toHaveProperty('macdSignal');
    expect(result).toHaveProperty('macdHistogram');
    expect(result).toHaveProperty('bbUpper');
    expect(result).toHaveProperty('bbMiddle');
    expect(result).toHaveProperty('bbLower');
    expect(result).toHaveProperty('volumeRatio');
  });

  it('모든 숫자 값은 유한한 수여야 한다', () => {
    const result = service.calculateAll(prices, volumes);

    for (const [key, value] of Object.entries(result)) {
      if (value !== undefined && value !== null) {
        expect(Number.isFinite(value)).toBe(true);
      }
    }
  });

  it('RSI는 0-100 범위여야 한다', () => {
    const result = service.calculateAll(prices, volumes);

    if (result.rsi14 !== undefined) {
      expect(result.rsi14).toBeGreaterThanOrEqual(0);
      expect(result.rsi14).toBeLessThanOrEqual(100);
    }
  });

  it('volumeRatio는 0 이상이어야 한다', () => {
    const result = service.calculateAll(prices, volumes);

    if (result.volumeRatio !== undefined) {
      expect(result.volumeRatio).toBeGreaterThanOrEqual(0);
    }
  });
});
