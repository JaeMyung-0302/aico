import { SMA } from 'technicalindicators';
import { Indicator, IndicatorResult } from '../interfaces/indicator.interface';

export class SmaIndicator implements Indicator {
  calculate(closePrices: number[]): IndicatorResult {
    const sma20 = this.computeSma(closePrices, 20);
    const sma50 = this.computeSma(closePrices, 50);
    const sma200 = this.computeSma(closePrices, 200);

    return {
      name: 'SMA',
      values: { sma20, sma50, sma200 },
    };
  }

  private computeSma(prices: number[], period: number): number | undefined {
    if (prices.length < period) return undefined;

    const result = SMA.calculate({ period, values: prices });
    return result.length > 0 ? result[result.length - 1] : undefined;
  }
}
