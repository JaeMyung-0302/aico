export interface IndicatorResult {
  name: string;
  values: Record<string, number | undefined>;
}

export interface Indicator {
  calculate(closePrices: number[]): IndicatorResult;
}
