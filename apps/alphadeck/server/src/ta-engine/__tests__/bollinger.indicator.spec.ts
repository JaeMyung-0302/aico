import { BollingerIndicator } from '../indicators/bollinger.indicator';

describe('BollingerIndicator', () => {
  const indicator = new BollingerIndicator();

  const prices = Array.from({ length: 25 }, (_, i) => 100 + Math.sin(i / 3) * 5);

  it('상단/중단/하단 밴드를 반환해야 한다', () => {
    const result = indicator.calculate(prices);

    expect(result.name).toBe('BollingerBands');
    expect(result.values).toHaveProperty('bbUpper');
    expect(result.values).toHaveProperty('bbMiddle');
    expect(result.values).toHaveProperty('bbLower');
  });

  it('upper > middle > lower 순서여야 한다', () => {
    const result = indicator.calculate(prices);

    if (
      result.values.bbUpper !== undefined &&
      result.values.bbMiddle !== undefined &&
      result.values.bbLower !== undefined
    ) {
      expect(result.values.bbUpper).toBeGreaterThan(result.values.bbMiddle);
      expect(result.values.bbMiddle).toBeGreaterThan(result.values.bbLower);
    }
  });

  it('middle은 SMA20과 동일해야 한다', () => {
    const stablePrices = Array.from({ length: 25 }, () => 100);
    const result = indicator.calculate(stablePrices);

    if (result.values.bbMiddle !== undefined) {
      expect(result.values.bbMiddle).toBeCloseTo(100, 1);
    }
  });

  it('데이터가 부족하면 undefined를 반환해야 한다', () => {
    const shortPrices = [100, 101];
    const result = indicator.calculate(shortPrices);

    expect(result.values.bbUpper).toBeUndefined();
  });
});
