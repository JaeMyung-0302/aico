import { Injectable } from '@nestjs/common';
import { SmaIndicator } from './indicators/sma.indicator';
import { EmaIndicator } from './indicators/ema.indicator';
import { RsiIndicator } from './indicators/rsi.indicator';
import { MacdIndicator } from './indicators/macd.indicator';
import { BollingerIndicator } from './indicators/bollinger.indicator';
import { VolumeIndicator } from './indicators/volume.indicator';
import { AtrIndicator } from './indicators/atr.indicator';
import { ObvIndicator } from './indicators/obv.indicator';
import { StochasticIndicator } from './indicators/stochastic.indicator';
import { AdxIndicator } from './indicators/adx.indicator';

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
  atr14?: number;
  obv?: number;
  stochasticK?: number;
  stochasticD?: number;
  adx14?: number;
}

@Injectable()
export class TaEngineService {
  private readonly sma = new SmaIndicator();
  private readonly ema = new EmaIndicator();
  private readonly rsi = new RsiIndicator();
  private readonly macd = new MacdIndicator();
  private readonly bollinger = new BollingerIndicator();
  private readonly volume = new VolumeIndicator();
  private readonly atr = new AtrIndicator();
  private readonly obv = new ObvIndicator();
  private readonly stochastic = new StochasticIndicator();
  private readonly adx = new AdxIndicator();

  calculateAll(
    closePrices: number[],
    volumes: number[],
    highs?: number[],
    lows?: number[],
  ): TaResultData {
    const smaResult = this.sma.calculate(closePrices);
    const emaResult = this.ema.calculate(closePrices);
    const rsiResult = this.rsi.calculate(closePrices);
    const macdResult = this.macd.calculate(closePrices);
    const bbResult = this.bollinger.calculate(closePrices);
    const volResult = this.volume.calculate(volumes);

    const obvResult = this.obv.calculate(closePrices, volumes);

    const hasHlc = highs && lows && highs.length > 0 && lows.length > 0;
    const atrResult = hasHlc ? this.atr.calculate(highs, lows, closePrices) : undefined;
    const stochResult = hasHlc ? this.stochastic.calculate(highs, lows, closePrices) : undefined;
    const adxResult = hasHlc ? this.adx.calculate(highs, lows, closePrices) : undefined;

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
      atr14: atrResult?.values.atr14,
      obv: obvResult.values.obv,
      stochasticK: stochResult?.values.stochasticK,
      stochasticD: stochResult?.values.stochasticD,
      adx14: adxResult?.values.adx14,
    };
  }
}
