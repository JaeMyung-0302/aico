import type { TaResultData } from '../ta-engine/ta-engine.service';

export type SignalType =
  | 'RSI_OVERSOLD'
  | 'RSI_OVERBOUGHT'
  | 'MACD_BULLISH_CROSS'
  | 'MACD_BEARISH_CROSS'
  | 'BB_LOWER_BREAK'
  | 'BB_UPPER_BREAK'
  | 'VOLUME_SURGE'
  | 'GOLDEN_CROSS'
  | 'DEATH_CROSS';

export type SignalDirection = 'BULLISH' | 'BEARISH' | 'NEUTRAL';

export interface DetectedSignal {
  type: SignalType;
  direction: SignalDirection;
  value: number;
  threshold: number;
  message: string;
}

interface DetectInput {
  symbol: string;
  current: TaResultData;
  previous?: TaResultData;
  currentPrice: number;
}

const THRESHOLDS = {
  RSI_OVERSOLD: 30,
  RSI_OVERBOUGHT: 70,
  VOLUME_SURGE: 2.0,
} as const;

export const detectSignals = (input: DetectInput): DetectedSignal[] => {
  const { current, previous, currentPrice } = input;
  const signals: DetectedSignal[] = [];

  // RSI 과매도
  if (current.rsi14 != null && current.rsi14 <= THRESHOLDS.RSI_OVERSOLD) {
    signals.push({
      type: 'RSI_OVERSOLD',
      direction: 'BULLISH',
      value: current.rsi14,
      threshold: THRESHOLDS.RSI_OVERSOLD,
      message: `RSI ${current.rsi14.toFixed(1)}로 과매도 구간 진입`,
    });
  }

  // RSI 과매수
  if (current.rsi14 != null && current.rsi14 >= THRESHOLDS.RSI_OVERBOUGHT) {
    signals.push({
      type: 'RSI_OVERBOUGHT',
      direction: 'BEARISH',
      value: current.rsi14,
      threshold: THRESHOLDS.RSI_OVERBOUGHT,
      message: `RSI ${current.rsi14.toFixed(1)}로 과매수 구간 진입`,
    });
  }

  // MACD 골든크로스 (시그널선 상향 돌파)
  if (
    current.macdLine != null &&
    current.macdSignal != null &&
    previous?.macdLine != null &&
    previous?.macdSignal != null
  ) {
    const prevDiff = previous.macdLine - previous.macdSignal;
    const currDiff = current.macdLine - current.macdSignal;

    if (prevDiff <= 0 && currDiff > 0) {
      signals.push({
        type: 'MACD_BULLISH_CROSS',
        direction: 'BULLISH',
        value: currDiff,
        threshold: 0,
        message: 'MACD 시그널선 상향 돌파 (골든크로스)',
      });
    }

    if (prevDiff >= 0 && currDiff < 0) {
      signals.push({
        type: 'MACD_BEARISH_CROSS',
        direction: 'BEARISH',
        value: currDiff,
        threshold: 0,
        message: 'MACD 시그널선 하향 돌파 (데드크로스)',
      });
    }
  }

  // 볼린저밴드 하단 이탈
  if (current.bbLower != null && currentPrice <= current.bbLower) {
    signals.push({
      type: 'BB_LOWER_BREAK',
      direction: 'BULLISH',
      value: currentPrice,
      threshold: current.bbLower,
      message: `현재가 $${currentPrice.toFixed(2)}가 볼린저밴드 하단($${current.bbLower.toFixed(2)}) 이탈`,
    });
  }

  // 볼린저밴드 상단 이탈
  if (current.bbUpper != null && currentPrice >= current.bbUpper) {
    signals.push({
      type: 'BB_UPPER_BREAK',
      direction: 'BEARISH',
      value: currentPrice,
      threshold: current.bbUpper,
      message: `현재가 $${currentPrice.toFixed(2)}가 볼린저밴드 상단($${current.bbUpper.toFixed(2)}) 이탈`,
    });
  }

  // 거래량 급증
  if (current.volumeRatio != null && current.volumeRatio >= THRESHOLDS.VOLUME_SURGE) {
    signals.push({
      type: 'VOLUME_SURGE',
      direction: 'NEUTRAL',
      value: current.volumeRatio,
      threshold: THRESHOLDS.VOLUME_SURGE,
      message: `거래량 20일 평균 대비 ${current.volumeRatio.toFixed(1)}배 급증`,
    });
  }

  // SMA 골든/데드크로스 (SMA20 vs SMA50)
  if (
    current.sma20 != null &&
    current.sma50 != null &&
    previous?.sma20 != null &&
    previous?.sma50 != null
  ) {
    if (previous.sma20 <= previous.sma50 && current.sma20 > current.sma50) {
      signals.push({
        type: 'GOLDEN_CROSS',
        direction: 'BULLISH',
        value: current.sma20,
        threshold: current.sma50,
        message: 'SMA 20일선이 50일선 상향 돌파 (골든크로스)',
      });
    }

    if (previous.sma20 >= previous.sma50 && current.sma20 < current.sma50) {
      signals.push({
        type: 'DEATH_CROSS',
        direction: 'BEARISH',
        value: current.sma20,
        threshold: current.sma50,
        message: 'SMA 20일선이 50일선 하향 돌파 (데드크로스)',
      });
    }
  }

  return signals;
};

export const deduplicateSignals = (
  newSignals: Array<{ symbol: string; type: SignalType }>,
  recentSignals: Array<{ symbol: string; type: string; createdAt: Date }>,
  windowMs = 24 * 60 * 60 * 1000,
): Array<{ symbol: string; type: SignalType }> => {
  const now = Date.now();

  return newSignals.filter((signal) => {
    const isDuplicate = recentSignals.some(
      (recent) =>
        recent.symbol === signal.symbol &&
        recent.type === signal.type &&
        now - new Date(recent.createdAt).getTime() < windowMs,
    );
    return !isDuplicate;
  });
};
