import type { TaResultData } from '../../ta-engine/ta-engine.service';

export interface StrategyInput {
  price: number;
  ta: TaResultData;
  previousTa?: TaResultData;
}

export interface Strategy {
  name: string;
  shouldBuy(input: StrategyInput): boolean;
  shouldSell(input: StrategyInput): boolean;
}

export interface BacktestTrade {
  date: string;
  action: 'BUY' | 'SELL';
  price: number;
  reason: string;
}

export interface BacktestResult {
  strategy: string;
  symbol: string;
  period: string;
  totalReturn: number;
  buyAndHoldReturn: number;
  trades: BacktestTrade[];
  tradeCount: number;
  winRate: number;
  maxDrawdown: number;
  sharpeRatio: number;
}
