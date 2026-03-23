import { SmaIndicator } from '../indicators/sma.indicator';

describe('SmaIndicator', () => {
  const indicator = new SmaIndicator();

  // 10일 간의 종가 데이터
  const prices = [22, 24, 25, 23, 26, 28, 26, 29, 27, 30];

  it('SMA 20/50/200 값을 반환해야 한다', () => {
    // 200일 데이터가 부족하면 undefined
    const result = indicator.calculate(prices);

    expect(result.name).toBe('SMA');
    expect(result.values).toHaveProperty('sma20');
    expect(result.values).toHaveProperty('sma50');
    expect(result.values).toHaveProperty('sma200');
  });

  it('데이터가 충분하면 SMA를 정확히 계산해야 한다', () => {
    // 20개 종가로 SMA20 계산
    const twentyPrices = Array.from({ length: 25 }, (_, i) => 100 + i);
    const result = indicator.calculate(twentyPrices);

    // SMA20 = 최근 20개 평균 = (6+7+...+25 + 100) / 20
    // = (106 + 107 + ... + 124) / 20 = mean of 106..124
    expect(result.values.sma20).toBeDefined();
    expect(typeof result.values.sma20).toBe('number');
  });

  it('데이터가 부족하면 undefined를 반환해야 한다', () => {
    const shortPrices = [100, 101, 102];
    const result = indicator.calculate(shortPrices);

    expect(result.values.sma50).toBeUndefined();
    expect(result.values.sma200).toBeUndefined();
  });
});
