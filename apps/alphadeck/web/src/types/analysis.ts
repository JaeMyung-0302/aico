export interface TaResult {
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
  compositeScore?: number;
}

export interface IndicatorScore {
  name: string;
  value: number;
  direction: 'BUY' | 'SELL' | 'NEUTRAL';
  weight: number;
}

export interface SignalScore {
  score: number;
  breakdown: IndicatorScore[];
}

export interface PriceData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface AnalysisResponse {
  symbol: string;
  prices: PriceData[];
  taResult: TaResult;
  signalScore: SignalScore;
  interpretation?: string;
}
