import { detectSignals, deduplicateSignals, type DetectedSignal } from '../signal-detector';
import type { TaResultData } from '../../ta-engine/ta-engine.service';

describe('SignalDetector', () => {
  describe('detectSignals', () => {
    const baseInput = {
      symbol: 'AAPL',
      currentPrice: 150,
      current: {} as TaResultData,
      previous: {} as TaResultData,
    };

    it('RSI 과매도 시그널 감지 (RSI <= 30)', () => {
      const signals = detectSignals({
        ...baseInput,
        current: { rsi14: 28.5 },
      });

      expect(signals).toHaveLength(1);
      expect(signals[0]?.type).toBe('RSI_OVERSOLD');
      expect(signals[0]?.direction).toBe('BULLISH');
    });

    it('RSI 경계값 30 정확히 감지', () => {
      const signals = detectSignals({
        ...baseInput,
        current: { rsi14: 30 },
      });

      expect(signals.some((s) => s.type === 'RSI_OVERSOLD')).toBe(true);
    });

    it('RSI 과매수 시그널 감지 (RSI >= 70)', () => {
      const signals = detectSignals({
        ...baseInput,
        current: { rsi14: 75.3 },
      });

      expect(signals).toHaveLength(1);
      expect(signals[0]?.type).toBe('RSI_OVERBOUGHT');
      expect(signals[0]?.direction).toBe('BEARISH');
    });

    it('RSI 중립 구간에서 시그널 없음', () => {
      const signals = detectSignals({
        ...baseInput,
        current: { rsi14: 55 },
      });

      expect(signals).toHaveLength(0);
    });

    it('MACD 골든크로스 감지', () => {
      const signals = detectSignals({
        ...baseInput,
        current: { macdLine: 0.5, macdSignal: 0.3 },
        previous: { macdLine: 0.2, macdSignal: 0.3 },
      });

      expect(signals.some((s) => s.type === 'MACD_BULLISH_CROSS')).toBe(true);
    });

    it('MACD 데드크로스 감지', () => {
      const signals = detectSignals({
        ...baseInput,
        current: { macdLine: 0.2, macdSignal: 0.3 },
        previous: { macdLine: 0.5, macdSignal: 0.3 },
      });

      expect(signals.some((s) => s.type === 'MACD_BEARISH_CROSS')).toBe(true);
    });

    it('볼린저밴드 하단 이탈 감지', () => {
      const signals = detectSignals({
        ...baseInput,
        currentPrice: 140,
        current: { bbLower: 142 },
      });

      expect(signals.some((s) => s.type === 'BB_LOWER_BREAK')).toBe(true);
    });

    it('볼린저밴드 상단 이탈 감지', () => {
      const signals = detectSignals({
        ...baseInput,
        currentPrice: 165,
        current: { bbUpper: 163 },
      });

      expect(signals.some((s) => s.type === 'BB_UPPER_BREAK')).toBe(true);
    });

    it('거래량 급증 감지 (2배 이상)', () => {
      const signals = detectSignals({
        ...baseInput,
        current: { volumeRatio: 2.5 },
      });

      expect(signals.some((s) => s.type === 'VOLUME_SURGE')).toBe(true);
    });

    it('SMA 골든크로스 감지', () => {
      const signals = detectSignals({
        ...baseInput,
        current: { sma20: 155, sma50: 150 },
        previous: { sma20: 148, sma50: 150 },
      });

      expect(signals.some((s) => s.type === 'GOLDEN_CROSS')).toBe(true);
    });

    it('복합 시그널: 여러 조건 동시 충족', () => {
      const signals = detectSignals({
        ...baseInput,
        currentPrice: 140,
        current: { rsi14: 25, bbLower: 142, volumeRatio: 3.0 },
      });

      expect(signals.length).toBeGreaterThanOrEqual(3);
    });

    it('데이터 없으면 빈 배열 반환', () => {
      const signals = detectSignals({
        ...baseInput,
        current: {},
      });

      expect(signals).toHaveLength(0);
    });
  });

  describe('deduplicateSignals', () => {
    it('24시간 내 동일 시그널 중복 제거', () => {
      const newSignals = [
        { symbol: 'AAPL', type: 'RSI_OVERSOLD' as const },
        { symbol: 'TSLA', type: 'RSI_OVERBOUGHT' as const },
      ];

      const recentSignals = [
        {
          symbol: 'AAPL',
          type: 'RSI_OVERSOLD',
          createdAt: new Date(Date.now() - 1000 * 60 * 60), // 1시간 전
        },
      ];

      const result = deduplicateSignals(newSignals, recentSignals);

      expect(result).toHaveLength(1);
      expect(result[0]?.symbol).toBe('TSLA');
    });

    it('24시간 경과 시그널은 중복으로 간주하지 않음', () => {
      const newSignals = [{ symbol: 'AAPL', type: 'RSI_OVERSOLD' as const }];

      const recentSignals = [
        {
          symbol: 'AAPL',
          type: 'RSI_OVERSOLD',
          createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25시간 전
        },
      ];

      const result = deduplicateSignals(newSignals, recentSignals);

      expect(result).toHaveLength(1);
    });

    it('다른 종목은 중복 아님', () => {
      const newSignals = [{ symbol: 'TSLA', type: 'RSI_OVERSOLD' as const }];

      const recentSignals = [
        {
          symbol: 'AAPL',
          type: 'RSI_OVERSOLD',
          createdAt: new Date(Date.now() - 1000 * 60),
        },
      ];

      const result = deduplicateSignals(newSignals, recentSignals);

      expect(result).toHaveLength(1);
    });
  });
});
