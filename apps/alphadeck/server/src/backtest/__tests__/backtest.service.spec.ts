import { RsiStrategy } from '../strategies/rsi-strategy';
import { MacdStrategy } from '../strategies/macd-strategy';
import { CompositeStrategy } from '../strategies/composite-strategy';
import type { StrategyInput } from '../interfaces/strategy.interface';

describe('Backtest Strategies', () => {
  describe('RsiStrategy', () => {
    const strategy = new RsiStrategy();

    it('RSI <= 30 → 매수', () => {
      const input: StrategyInput = { price: 150, ta: { rsi14: 28 } };
      expect(strategy.shouldBuy(input)).toBe(true);
      expect(strategy.shouldSell(input)).toBe(false);
    });

    it('RSI >= 70 → 매도', () => {
      const input: StrategyInput = { price: 150, ta: { rsi14: 75 } };
      expect(strategy.shouldBuy(input)).toBe(false);
      expect(strategy.shouldSell(input)).toBe(true);
    });

    it('RSI 중립 → 무신호', () => {
      const input: StrategyInput = { price: 150, ta: { rsi14: 50 } };
      expect(strategy.shouldBuy(input)).toBe(false);
      expect(strategy.shouldSell(input)).toBe(false);
    });

    it('RSI 없으면 → 무신호', () => {
      const input: StrategyInput = { price: 150, ta: {} };
      expect(strategy.shouldBuy(input)).toBe(false);
      expect(strategy.shouldSell(input)).toBe(false);
    });
  });

  describe('MacdStrategy', () => {
    const strategy = new MacdStrategy();

    it('MACD 골든크로스 → 매수', () => {
      const input: StrategyInput = {
        price: 150,
        ta: { macdLine: 0.5, macdSignal: 0.3 },
        previousTa: { macdLine: 0.2, macdSignal: 0.3 },
      };
      expect(strategy.shouldBuy(input)).toBe(true);
    });

    it('MACD 데드크로스 → 매도', () => {
      const input: StrategyInput = {
        price: 150,
        ta: { macdLine: 0.2, macdSignal: 0.3 },
        previousTa: { macdLine: 0.5, macdSignal: 0.3 },
      };
      expect(strategy.shouldSell(input)).toBe(true);
    });

    it('이전 데이터 없으면 → 무신호', () => {
      const input: StrategyInput = {
        price: 150,
        ta: { macdLine: 0.5, macdSignal: 0.3 },
      };
      expect(strategy.shouldBuy(input)).toBe(false);
      expect(strategy.shouldSell(input)).toBe(false);
    });
  });

  describe('CompositeStrategy', () => {
    const strategy = new CompositeStrategy();

    it('강한 매수 시그널 조합 → 매수', () => {
      const input: StrategyInput = {
        price: 140,
        ta: {
          rsi14: 25,
          macdHistogram: 0.5,
          bbUpper: 160,
          bbMiddle: 150,
          bbLower: 142,
          volumeRatio: 2.5,
        },
      };
      expect(strategy.shouldBuy(input)).toBe(true);
    });

    it('강한 매도 시그널 조합 → 매도', () => {
      const input: StrategyInput = {
        price: 162,
        ta: {
          rsi14: 80,
          macdHistogram: -0.5,
          bbUpper: 160,
          bbMiddle: 150,
          bbLower: 140,
          volumeRatio: 0.5,
        },
      };
      expect(strategy.shouldSell(input)).toBe(true);
    });

    it('중립 시그널 → 무신호', () => {
      const input: StrategyInput = {
        price: 150,
        ta: { rsi14: 50, macdHistogram: 0 },
      };
      expect(strategy.shouldBuy(input)).toBe(false);
      expect(strategy.shouldSell(input)).toBe(false);
    });
  });
});
