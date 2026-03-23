import { RsiIndicator } from '../indicators/rsi.indicator';

describe('RsiIndicator', () => {
  const indicator = new RsiIndicator();

  it('RSI 14 값을 반환해야 한다', () => {
    // 최소 15개 데이터 필요 (14일 period + 1)
    const prices = [
      44, 44.34, 44.09, 43.61, 44.33, 44.83, 45.10, 45.42, 45.84,
      46.08, 45.89, 46.03, 45.61, 46.28, 46.28, 46.00, 46.03, 46.41,
      46.22, 45.64,
    ];
    const result = indicator.calculate(prices);

    expect(result.name).toBe('RSI');
    expect(result.values.rsi14).toBeDefined();
    expect(result.values.rsi14).toBeGreaterThanOrEqual(0);
    expect(result.values.rsi14).toBeLessThanOrEqual(100);
  });

  it('지속 상승 시 RSI가 70 이상이어야 한다', () => {
    const risingPrices = Array.from({ length: 30 }, (_, i) => 100 + i * 2);
    const result = indicator.calculate(risingPrices);

    expect(result.values.rsi14).toBeGreaterThan(70);
  });

  it('지속 하락 시 RSI가 30 이하여야 한다', () => {
    const fallingPrices = Array.from({ length: 30 }, (_, i) => 200 - i * 2);
    const result = indicator.calculate(fallingPrices);

    expect(result.values.rsi14).toBeLessThan(30);
  });

  it('데이터가 부족하면 undefined를 반환해야 한다', () => {
    const shortPrices = [100, 101, 102];
    const result = indicator.calculate(shortPrices);

    expect(result.values.rsi14).toBeUndefined();
  });
});
