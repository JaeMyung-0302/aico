export interface PriceDataRow {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface MarketDataProvider {
  fetchHistorical(symbol: string, days: number): Promise<PriceDataRow[]>;
}
