import { MACD } from 'technicalindicators';
import { Indicator, IndicatorResult } from '../interfaces/indicator.interface';

export class MacdIndicator implements Indicator {
  calculate(closePrices: number[]): IndicatorResult {
    if (closePrices.length < 35) {
      return {
        name: 'MACD',
        values: {
          macdLine: undefined,
          macdSignal: undefined,
          macdHistogram: undefined,
        },
      };
    }

    const result = MACD.calculate({
      values: closePrices,
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
      SimpleMAOscillator: false,
      SimpleMASignal: false,
    });

    const latest = result.length > 0 ? result[result.length - 1] : null;

    return {
      name: 'MACD',
      values: {
        macdLine: latest?.MACD ?? undefined,
        macdSignal: latest?.signal ?? undefined,
        macdHistogram: latest?.histogram ?? undefined,
      },
    };
  }
}
