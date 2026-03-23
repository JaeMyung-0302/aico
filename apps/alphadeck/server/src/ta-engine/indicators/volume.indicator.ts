import { IndicatorResult } from '../interfaces/indicator.interface';

export class VolumeIndicator {
  calculate(volumes: number[]): IndicatorResult {
    if (volumes.length < 20) {
      return { name: 'Volume', values: { volumeRatio: undefined } };
    }

    const recent20 = volumes.slice(-20);
    const avg = recent20.reduce((sum, v) => sum + v, 0) / 20;
    const current = volumes[volumes.length - 1] ?? 0;
    const volumeRatio = avg > 0 ? current / avg : 0;

    return {
      name: 'Volume',
      values: { volumeRatio: Math.round(volumeRatio * 100) / 100 },
    };
  }
}
