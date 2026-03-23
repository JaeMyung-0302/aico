import { RSI } from 'technicalindicators';
import { Indicator, IndicatorResult } from '../interfaces/indicator.interface';

export class RsiIndicator implements Indicator {
  calculate(closePrices: number[]): IndicatorResult {
    if (closePrices.length < 15) {
      return { name: 'RSI', values: { rsi14: undefined } };
    }

    const result = RSI.calculate({ period: 14, values: closePrices });
    const rsi14 = result.length > 0 ? result[result.length - 1] : undefined;

    return {
      name: 'RSI',
      values: { rsi14 },
    };
  }
}
