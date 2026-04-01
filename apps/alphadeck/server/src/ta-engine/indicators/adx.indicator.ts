import { ADX } from 'technicalindicators';
import { IndicatorResult } from '../interfaces/indicator.interface';

export class AdxIndicator {
  calculate(highs: number[], lows: number[], closes: number[]): IndicatorResult {
    if (highs.length < 28 || lows.length < 28 || closes.length < 28) {
      return { name: 'ADX', values: { adx14: undefined } };
    }

    const result = ADX.calculate({ high: highs, low: lows, close: closes, period: 14 });
    const last = result.length > 0 ? result[result.length - 1] : undefined;

    return { name: 'ADX', values: { adx14: last?.adx } };
  }
}
