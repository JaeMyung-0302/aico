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
  atr14?: number;
  obv?: number;
  stochasticK?: number;
  stochasticD?: number;
  adx14?: number;
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

export type Interval = '1d' | '1wk' | '1mo';

export interface NewsArticle {
  title: string;
  summary: string;
  sentiment: 'positive' | 'negative' | 'neutral';
}

export interface UpcomingEvent {
  date: string;
  type: string;
  description: string;
}

export interface NewsContext {
  articles: NewsArticle[];
  overallSentiment: number;
  upcomingEvents: UpcomingEvent[];
}

export interface AccuracyResult {
  signalType: string;
  total: number;
  correct: number;
  accuracy: number;
}

export interface AnalysisResponse {
  symbol: string;
  prices: PriceData[];
  taResult: TaResult;
  signalScore: SignalScore;
  interpretation?: string;
  newsContext?: NewsContext | null;
  accuracy?: AccuracyResult[];
}
