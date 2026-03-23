import type { Strategy, StrategyInput } from '../interfaces/strategy.interface';

export class RsiStrategy implements Strategy {
  name = 'RSI (14)';

  shouldBuy(input: StrategyInput): boolean {
    const rsi = input.ta.rsi14;
    return rsi != null && rsi <= 30;
  }

  shouldSell(input: StrategyInput): boolean {
    const rsi = input.ta.rsi14;
    return rsi != null && rsi >= 70;
  }
}
