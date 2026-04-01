import { Stochastic } from 'technicalindicators';
import { IndicatorResult } from '../interfaces/indicator.interface';

export class StochasticIndicator {
  calculate(highs: number[], lows: number[], closes: number[]): IndicatorResult {
    if (highs.length < 17 || lows.length < 17 || closes.length < 17) {
      return { name: 'Stochastic', values: { stochasticK: undefined, stochasticD: undefined } };
    }

    const result = Stochastic.calculate({
      high: highs,
      low: lows,
      close: closes,
      period: 14,
      signalPeriod: 3,
    });

    const last = result.length > 0 ? result[result.length - 1] : undefined;

    return {
      name: 'Stochastic',
      values: {
        stochasticK: last?.k,
        stochasticD: last?.d,
      },
    };
  }
}
