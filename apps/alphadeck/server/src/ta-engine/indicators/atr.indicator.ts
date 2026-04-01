import { ATR } from 'technicalindicators';
import { IndicatorResult } from '../interfaces/indicator.interface';

export class AtrIndicator {
  calculate(highs: number[], lows: number[], closes: number[]): IndicatorResult {
    if (highs.length < 15 || lows.length < 15 || closes.length < 15) {
      return { name: 'ATR', values: { atr14: undefined } };
    }

    const result = ATR.calculate({ high: highs, low: lows, close: closes, period: 14 });
    const atr14 = result.length > 0 ? result[result.length - 1] : undefined;

    return { name: 'ATR', values: { atr14 } };
  }
}
