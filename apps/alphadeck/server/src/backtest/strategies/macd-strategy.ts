import type { Strategy, StrategyInput } from '../interfaces/strategy.interface';

export class MacdStrategy implements Strategy {
  name = 'MACD Crossover';

  shouldBuy(input: StrategyInput): boolean {
    const curr = input.ta;
    const prev = input.previousTa;
    if (curr.macdLine == null || curr.macdSignal == null) return false;
    if (prev?.macdLine == null || prev?.macdSignal == null) return false;

    const prevDiff = prev.macdLine - prev.macdSignal;
    const currDiff = curr.macdLine - curr.macdSignal;
    return prevDiff <= 0 && currDiff > 0;
  }

  shouldSell(input: StrategyInput): boolean {
    const curr = input.ta;
    const prev = input.previousTa;
    if (curr.macdLine == null || curr.macdSignal == null) return false;
    if (prev?.macdLine == null || prev?.macdSignal == null) return false;

    const prevDiff = prev.macdLine - prev.macdSignal;
    const currDiff = curr.macdLine - curr.macdSignal;
    return prevDiff >= 0 && currDiff < 0;
  }
}
