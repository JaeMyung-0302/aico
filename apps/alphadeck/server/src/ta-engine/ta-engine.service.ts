import { Injectable } from '@nestjs/common';
import { SmaIndicator } from './indicators/sma.indicator';
import { EmaIndicator } from './indicators/ema.indicator';
import { RsiIndicator } from './indicators/rsi.indicator';
import { MacdIndicator } from './indicators/macd.indicator';
import { BollingerIndicator } from './indicators/bollinger.indicator';
import { VolumeIndicator } from './indicators/volume.indicator';

export interface TaResultData {
  sma20?: number;
  sma50?: number;
  sma200?: number;
  ema12?: number;
  ema26?: number;
  rsi14?: number;
  macdLine?: number;
  macdSignal?: number;
  macdHistogram?: number;
  bbUpper?: number;
  bbMiddle?: number;
  bbLower?: number;
  volumeRatio?: number;
}

@Injectable()
export class TaEngineService {
  private readonly sma = new SmaIndicator();
  private readonly ema = new EmaIndicator();
  private readonly rsi = new RsiIndicator();
  private readonly macd = new MacdIndicator();
  private readonly bollinger = new BollingerIndicator();
  private readonly volume = new VolumeIndicator();

  calculateAll(closePrices: number[], volumes: number[]): TaResultData {
    const smaResult = this.sma.calculate(closePrices);
    const emaResult = this.ema.calculate(closePrices);
    const rsiResult = this.rsi.calculate(closePrices);
    const macdResult = this.macd.calculate(closePrices);
    const bbResult = this.bollinger.calculate(closePrices);
    const volResult = this.volume.calculate(volumes);

    return {
      sma20: smaResult.values.sma20,
      sma50: smaResult.values.sma50,
      sma200: smaResult.values.sma200,
      ema12: emaResult.values.ema12,
      ema26: emaResult.values.ema26,
      rsi14: rsiResult.values.rsi14,
      macdLine: macdResult.values.macdLine,
      macdSignal: macdResult.values.macdSignal,
      macdHistogram: macdResult.values.macdHistogram,
      bbUpper: bbResult.values.bbUpper,
      bbMiddle: bbResult.values.bbMiddle,
      bbLower: bbResult.values.bbLower,
      volumeRatio: volResult.values.volumeRatio,
    };
  }
}
