import type { Strategy, StrategyInput } from '../interfaces/strategy.interface';

export class CompositeStrategy implements Strategy {
  name = 'Composite Score';

  private readonly buyThreshold: number;
  private readonly sellThreshold: number;

  constructor(buyThreshold = 40, sellThreshold = -40) {
    this.buyThreshold = buyThreshold;
    this.sellThreshold = sellThreshold;
  }

  shouldBuy(input: StrategyInput): boolean {
    // compositeScore는 TA 엔진에서 직접 제공되지 않으므로
    // 개별 지표로 근사 계산
    const score = this.estimateScore(input);
    return score >= this.buyThreshold;
  }

  shouldSell(input: StrategyInput): boolean {
    const score = this.estimateScore(input);
    return score <= this.sellThreshold;
  }

  private estimateScore(input: StrategyInput): number {
    const { ta } = input;
    let score = 0;
    let weights = 0;

    // RSI (25%)
    if (ta.rsi14 != null) {
      if (ta.rsi14 <= 30) score += 25;
      else if (ta.rsi14 >= 70) score -= 25;
      else score += ((50 - ta.rsi14) / 20) * 25;
      weights += 25;
    }

    // MACD histogram (25%)
    if (ta.macdHistogram != null) {
      const normalized = Math.max(-1, Math.min(1, ta.macdHistogram * 10));
      score += normalized * 25;
      weights += 25;
    }

    // BB position (20%)
    if (ta.bbUpper != null && ta.bbLower != null && ta.bbMiddle != null) {
      const range = ta.bbUpper - ta.bbLower;
      if (range > 0) {
        const position = (input.price - ta.bbLower) / range;
        score += (0.5 - position) * 40;
      }
      weights += 20;
    }

    // Volume (15%)
    if (ta.volumeRatio != null) {
      if (ta.volumeRatio >= 2) score += 15;
      else if (ta.volumeRatio >= 1.5) score += 7;
      weights += 15;
    }

    return weights > 0 ? (score / weights) * 100 : 0;
  }
}
