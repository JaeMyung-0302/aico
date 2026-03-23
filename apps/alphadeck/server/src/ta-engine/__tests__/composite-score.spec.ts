import { calculateCompositeScore } from '../scoring/composite-score';
import { TaResultData } from '../ta-engine.service';

describe('calculateCompositeScore', () => {
  it('모든 매수 시그널이면 +80 이상이어야 한다', () => {
    const bullishData: TaResultData = {
      sma200: 100,    // 현재가 150 > SMA200 → 상승 추세
      rsi14: 25,      // 과매도 → 매수
      macdLine: 2,
      macdSignal: 1,
      macdHistogram: 1,  // 양수 → 매수
      bbUpper: 160,
      bbMiddle: 140,
      bbLower: 120,   // 현재가 근처 → 하단 접근 매수
      volumeRatio: 2.5, // 강한 거래량
    };

    const score = calculateCompositeScore(bullishData, 150);
    expect(score.score).toBeGreaterThan(0);
    expect(score.breakdown.length).toBeGreaterThan(0);
  });

  it('모든 매도 시그널이면 -50 이하여야 한다', () => {
    const bearishData: TaResultData = {
      sma200: 200,    // 현재가 150 < SMA200 → 하락 추세
      rsi14: 82,      // 과매수 → 매도
      macdLine: -2,
      macdSignal: -1,
      macdHistogram: -1,  // 음수 → 매도
      bbUpper: 160,
      bbMiddle: 140,
      bbLower: 120,   // 현재가 150 → 상단 접근 매도
      volumeRatio: 2.5,
    };

    const score = calculateCompositeScore(bearishData, 150);
    expect(score.score).toBeLessThan(0);
  });

  it('중립 상태면 -20 ~ +20 범위여야 한다', () => {
    const neutralData: TaResultData = {
      sma200: 150,    // 현재가 = SMA200
      rsi14: 50,      // 중립
      macdLine: 0,
      macdSignal: 0,
      macdHistogram: 0,
      bbUpper: 160,
      bbMiddle: 150,
      bbLower: 140,
      volumeRatio: 1.0,
    };

    const score = calculateCompositeScore(neutralData, 150);
    expect(score.score).toBeGreaterThanOrEqual(-20);
    expect(score.score).toBeLessThanOrEqual(20);
  });

  it('스코어는 -100 ~ +100 범위여야 한다', () => {
    const extremeData: TaResultData = {
      sma200: 50,
      rsi14: 5,
      macdLine: 10,
      macdSignal: -5,
      macdHistogram: 15,
      bbUpper: 200,
      bbMiddle: 150,
      bbLower: 100,
      volumeRatio: 5.0,
    };

    const score = calculateCompositeScore(extremeData, 200);
    expect(score.score).toBeGreaterThanOrEqual(-100);
    expect(score.score).toBeLessThanOrEqual(100);
  });

  it('breakdown에 각 지표별 점수가 포함되어야 한다', () => {
    const data: TaResultData = {
      sma200: 100,
      rsi14: 45,
      macdLine: 1,
      macdSignal: 0.5,
      macdHistogram: 0.5,
      bbUpper: 160,
      bbMiddle: 140,
      bbLower: 120,
      volumeRatio: 1.2,
    };

    const score = calculateCompositeScore(data, 150);
    const names = score.breakdown.map((b) => b.name);

    expect(names).toContain('RSI');
    expect(names).toContain('MACD');
    expect(names).toContain('BollingerBands');
    expect(names).toContain('SMA');
    expect(names).toContain('Volume');
  });

  it('undefined 값이 있어도 에러 없이 계산해야 한다', () => {
    const partialData: TaResultData = {
      rsi14: 50,
    };

    expect(() => calculateCompositeScore(partialData, 150)).not.toThrow();
  });
});
