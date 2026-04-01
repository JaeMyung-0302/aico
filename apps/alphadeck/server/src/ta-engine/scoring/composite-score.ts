import { TaResultData } from '../ta-engine.service';
import { SignalScore, IndicatorScore } from '../interfaces/signal-score.interface';
import { INDICATOR_WEIGHTS, INDICATOR_WEIGHTS_V2 } from './weights';

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

const scoreAtr = (atr14?: number, currentPrice?: number): IndicatorScore => {
  if (atr14 === undefined || !currentPrice || currentPrice <= 0) {
    return { name: 'ATR', value: 0, direction: 'NEUTRAL', weight: INDICATOR_WEIGHTS_V2.ATR };
  }
  // ATR/price 비율: 높은 변동성(>3%) = 중립, 낮은 변동성(<1%) = 약한 매수
  const ratio = (atr14 / currentPrice) * 100;
  const value = ratio > 3 ? 0 : clamp((1.5 - ratio) * 40, -50, 50);
  return { name: 'ATR', value, direction: 'NEUTRAL', weight: INDICATOR_WEIGHTS_V2.ATR };
};

const scoreObv = (obv?: number): IndicatorScore => {
  if (obv === undefined) {
    return { name: 'OBV', value: 0, direction: 'NEUTRAL', weight: INDICATOR_WEIGHTS_V2.OBV };
  }
  // OBV 양수 = 매수 압력, 음수 = 매도 압력
  const value = obv > 0 ? clamp(30, 0, 50) : obv < 0 ? clamp(-30, -50, 0) : 0;
  const direction = value > 20 ? 'BUY' : value < -20 ? 'SELL' : 'NEUTRAL';
  return { name: 'OBV', value, direction, weight: INDICATOR_WEIGHTS_V2.OBV };
};

const scoreStochastic = (k?: number, d?: number): IndicatorScore => {
  if (k === undefined) {
    return { name: 'Stochastic', value: 0, direction: 'NEUTRAL', weight: INDICATOR_WEIGHTS_V2.Stochastic };
  }
  // K < 20 = 과매도(매수), K > 80 = 과매수(매도)
  let value: number;
  if (k <= 20) {
    value = ((20 - k) / 20) * 80;
  } else if (k >= 80) {
    value = -((k - 80) / 20) * 80;
  } else {
    value = ((50 - k) / 30) * 30;
  }
  // K가 D를 상향 돌파하면 매수 가산
  if (d !== undefined && k > d && k < 50) {
    value += 20;
  }
  const direction = value > 20 ? 'BUY' : value < -20 ? 'SELL' : 'NEUTRAL';
  return { name: 'Stochastic', value: clamp(value, -100, 100), direction, weight: INDICATOR_WEIGHTS_V2.Stochastic };
};

const scoreAdx = (adx14?: number): IndicatorScore => {
  if (adx14 === undefined) {
    return { name: 'ADX', value: 0, direction: 'NEUTRAL', weight: INDICATOR_WEIGHTS_V2.ADX };
  }
  // ADX > 25 = 강한 추세, ADX < 20 = 약한 추세/횡보
  const value = adx14 > 25 ? clamp((adx14 - 25) * 3, 0, 50) : 0;
  return { name: 'ADX', value, direction: 'NEUTRAL', weight: INDICATOR_WEIGHTS_V2.ADX };
};

export const calculateCompositeScoreV2 = (
  data: TaResultData,
  currentPrice: number,
): SignalScore => {
  const breakdown: IndicatorScore[] = [
    { ...scoreRsi(data.rsi14), weight: INDICATOR_WEIGHTS_V2.RSI },
    { ...scoreMacd(data.macdHistogram), weight: INDICATOR_WEIGHTS_V2.MACD },
    { ...scoreBollinger(currentPrice, data.bbUpper, data.bbMiddle, data.bbLower), weight: INDICATOR_WEIGHTS_V2.BollingerBands },
    { ...scoreSma(currentPrice, data.sma200), weight: INDICATOR_WEIGHTS_V2.SMA },
    { ...scoreVolume(data.volumeRatio), weight: INDICATOR_WEIGHTS_V2.Volume },
    scoreAtr(data.atr14, currentPrice),
    scoreObv(data.obv),
    scoreStochastic(data.stochasticK, data.stochasticD),
    scoreAdx(data.adx14),
  ];

  const totalWeight = breakdown.reduce((sum, b) => sum + b.weight, 0);
  const weightedSum = breakdown.reduce((sum, b) => sum + b.value * b.weight, 0);
  const score = totalWeight > 0 ? weightedSum / totalWeight : 0;

  return {
    score: Math.round(clamp(score, -100, 100)),
    breakdown,
  };
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
