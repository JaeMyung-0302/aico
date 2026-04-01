import { OBV } from 'technicalindicators';
import { IndicatorResult } from '../interfaces/indicator.interface';

export class ObvIndicator {
  calculate(closes: number[], volumes: number[]): IndicatorResult {
    if (closes.length < 2 || volumes.length < 2) {
      return { name: 'OBV', values: { obv: undefined } };
    }

    const result = OBV.calculate({ close: closes, volume: volumes });
    const obv = result.length > 0 ? result[result.length - 1] : undefined;

    return { name: 'OBV', values: { obv } };
  }
}
