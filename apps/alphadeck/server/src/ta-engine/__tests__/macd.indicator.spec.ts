import { MacdIndicator } from '../indicators/macd.indicator';

describe('MacdIndicator', () => {
  const indicator = new MacdIndicator();

  // 35일 이상의 데이터 (EMA26 + signal 9)
  const prices = Array.from({ length: 40 }, (_, i) =>
    150 + Math.sin(i / 5) * 10 + i * 0.5,
  );

  it('MACD line, signal, histogram을 반환해야 한다', () => {
    const result = indicator.calculate(prices);

    expect(result.name).toBe('MACD');
    expect(result.values).toHaveProperty('macdLine');
    expect(result.values).toHaveProperty('macdSignal');
    expect(result.values).toHaveProperty('macdHistogram');
  });

  it('MACD line과 signal이 정의되면 histogram = line - signal이어야 한다', () => {
    const result = indicator.calculate(prices);

    if (
      result.values.macdLine !== undefined &&
      result.values.macdSignal !== undefined &&
      result.values.macdHistogram !== undefined
    ) {
      const expected = result.values.macdLine - result.values.macdSignal;
      expect(result.values.macdHistogram).toBeCloseTo(expected, 2);
    }
  });

  it('데이터가 부족하면 undefined를 반환해야 한다', () => {
    const shortPrices = [100, 101, 102, 103, 104];
    const result = indicator.calculate(shortPrices);

    expect(result.values.macdLine).toBeUndefined();
  });
});
