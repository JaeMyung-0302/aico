import { TaResultData } from '../ta-engine.service';
import { SignalScore, IndicatorScore } from '../interfaces/signal-score.interface';
import { INDICATOR_WEIGHTS } from './weights';

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const scoreRsi = (rsi?: number): IndicatorScore => {
  if (rsi === undefined) {
    return { name: 'RSI', value: 0, direction: 'NEUTRAL', weight: INDICATOR_WEIGHTS.RSI };
  }
  // RSI 30 이하 → 매수(+100), 70 이상 → 매도(-100), 50 = 중립(0)
  let value: number;
  if (rsi <= 30) {
    value = ((30 - rsi) / 30) * 100;
  } else if (rsi >= 70) {
    value = -((rsi - 70) / 30) * 100;
  } else {
    value = ((50 - rsi) / 20) * 50;
  }

  const direction = value > 20 ? 'BUY' : value < -20 ? 'SELL' : 'NEUTRAL';
  return { name: 'RSI', value: clamp(value, -100, 100), direction, weight: INDICATOR_WEIGHTS.RSI };
};

const scoreMacd = (histogram?: number): IndicatorScore => {
  if (histogram === undefined) {
    return { name: 'MACD', value: 0, direction: 'NEUTRAL', weight: INDICATOR_WEIGHTS.MACD };
  }
  // histogram 양수 → 매수, 음수 → 매도
  const value = clamp(histogram * 20, -100, 100);
  const direction = value > 20 ? 'BUY' : value < -20 ? 'SELL' : 'NEUTRAL';
  return { name: 'MACD', value, direction, weight: INDICATOR_WEIGHTS.MACD };
};

const scoreBollinger = (
  currentPrice: number,
  bbUpper?: number,
  bbMiddle?: number,
  bbLower?: number,
): IndicatorScore => {
  if (bbUpper === undefined || bbMiddle === undefined || bbLower === undefined) {
    return { name: 'BollingerBands', value: 0, direction: 'NEUTRAL', weight: INDICATOR_WEIGHTS.BollingerBands };
  }

  const bandWidth = bbUpper - bbLower;
  if (bandWidth <= 0) {
    return { name: 'BollingerBands', value: 0, direction: 'NEUTRAL', weight: INDICATOR_WEIGHTS.BollingerBands };
  }

  // 하단 접근 → 매수(+), 상단 접근 → 매도(-)
  const position = (currentPrice - bbMiddle) / (bandWidth / 2);
  const value = clamp(-position * 60, -100, 100);
  const direction = value > 20 ? 'BUY' : value < -20 ? 'SELL' : 'NEUTRAL';
  return { name: 'BollingerBands', value, direction, weight: INDICATOR_WEIGHTS.BollingerBands };
};

const scoreSma = (currentPrice: number, sma200?: number): IndicatorScore => {
  if (sma200 === undefined || sma200 <= 0) {
    return { name: 'SMA', value: 0, direction: 'NEUTRAL', weight: INDICATOR_WEIGHTS.SMA };
  }

  // 가격 > SMA200 → 상승 추세(+), 가격 < SMA200 → 하락 추세(-)
  const deviation = ((currentPrice - sma200) / sma200) * 100;
  const value = clamp(deviation * 5, -100, 100);
  const direction = value > 20 ? 'BUY' : value < -20 ? 'SELL' : 'NEUTRAL';
  return { name: 'SMA', value, direction, weight: INDICATOR_WEIGHTS.SMA };
};

const scoreVolume = (volumeRatio?: number): IndicatorScore => {
  if (volumeRatio === undefined) {
    return { name: 'Volume', value: 0, direction: 'NEUTRAL', weight: INDICATOR_WEIGHTS.Volume };
  }

  // 거래량 비율이 높을수록 현재 방향에 대한 확신이 높음
  // 1.0 = 평균, 2.0+ = 강한 움직임
  const intensity = clamp((volumeRatio - 1) * 50, -50, 50);
  return { name: 'Volume', value: intensity, direction: 'NEUTRAL', weight: INDICATOR_WEIGHTS.Volume };
};

export const calculateCompositeScore = (
  data: TaResultData,
  currentPrice: number,
): SignalScore => {
  const breakdown: IndicatorScore[] = [
    scoreRsi(data.rsi14),
    scoreMacd(data.macdHistogram),
    scoreBollinger(currentPrice, data.bbUpper, data.bbMiddle, data.bbLower),
    scoreSma(currentPrice, data.sma200),
    scoreVolume(data.volumeRatio),
  ];

  const totalWeight = breakdown.reduce((sum, b) => sum + b.weight, 0);
  const weightedSum = breakdown.reduce((sum, b) => sum + b.value * b.weight, 0);
  const score = totalWeight > 0 ? weightedSum / totalWeight : 0;

  return {
    score: Math.round(clamp(score, -100, 100)),
    breakdown,
  };
};
