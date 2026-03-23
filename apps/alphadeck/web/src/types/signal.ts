export interface SignalLog {
  id: number;
  symbol: string;
  type: string;
  direction: string;
  value: number;
  threshold: number;
  message: string;
  readAt: string | null;
  createdAt: string;
}

export interface TradeLog {
  id: number;
  symbol: string;
  action: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  tradedAt: string;
  memo?: string;
}
