import { BollingerBands } from 'technicalindicators';
import { Indicator, IndicatorResult } from '../interfaces/indicator.interface';

export class BollingerIndicator implements Indicator {
  calculate(closePrices: number[]): IndicatorResult {
    if (closePrices.length < 20) {
      return {
        name: 'BollingerBands',
        values: {
          bbUpper: undefined,
          bbMiddle: undefined,
          bbLower: undefined,
        },
      };
    }

    const result = BollingerBands.calculate({
      period: 20,
      values: closePrices,
      stdDev: 2,
    });

    const latest = result.length > 0 ? result[result.length - 1] : null;

    return {
      name: 'BollingerBands',
      values: {
        bbUpper: latest?.upper ?? undefined,
        bbMiddle: latest?.middle ?? undefined,
        bbLower: latest?.lower ?? undefined,
      },
    };
  }
}
