export interface IndicatorScore {
  name: string;
  value: number;
  direction: 'BUY' | 'SELL' | 'NEUTRAL';
  weight: number;
}

export interface SignalScore {
  score: number; // -100 ~ +100
  breakdown: IndicatorScore[];
}
