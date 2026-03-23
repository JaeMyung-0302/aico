import { EMA } from 'technicalindicators';
import { Indicator, IndicatorResult } from '../interfaces/indicator.interface';

export class EmaIndicator implements Indicator {
  calculate(closePrices: number[]): IndicatorResult {
    const ema12 = this.computeEma(closePrices, 12);
    const ema26 = this.computeEma(closePrices, 26);

    return {
      name: 'EMA',
      values: { ema12, ema26 },
    };
  }

  private computeEma(prices: number[], period: number): number | undefined {
    if (prices.length < period) return undefined;

    const result = EMA.calculate({ period, values: prices });
    return result.length > 0 ? result[result.length - 1] : undefined;
  }
}
