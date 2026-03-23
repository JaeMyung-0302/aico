interface TradeLog {
  id: number;
  symbol: string;
  action: string;
  quantity: number;
  price: number;
  tradedAt: Date;
  taSnapshot: any;
}

export interface TradeAnalysis {
  tradeId: number;
  symbol: string;
  action: string;
  price: number;
  tradedAt: string;
  taAtTime: {
    rsi14?: number;
    macdHistogram?: number;
    compositeScore?: number;
  };
  result: string;
  hindsight: string;
}

export class ReviewEngine {
  analyzeTrades(trades: TradeLog[]): TradeAnalysis[] {
    return trades.map((trade) => {
      const ta = trade.taSnapshot ?? {};
      const result = this.evaluateTradeDecision(trade.action, ta);
      const hindsight = this.generateHindsight(trade.action, ta);

      return {
        tradeId: trade.id,
        symbol: trade.symbol,
        action: trade.action,
        price: trade.price,
        tradedAt: trade.tradedAt.toISOString(),
        taAtTime: {
          rsi14: ta.rsi14 ?? undefined,
          macdHistogram: ta.macdHistogram ?? undefined,
          compositeScore: ta.compositeScore ?? undefined,
        },
        result,
        hindsight,
      };
    });
  }

  private evaluateTradeDecision(action: string, ta: any): string {
    const rsi = ta.rsi14;
    const score = ta.compositeScore;

    if (action === 'BUY') {
      if (rsi != null && rsi >= 70) return 'RISKY: 과매수 구간에서 매수';
      if (score != null && score < -30) return 'RISKY: 매도 시그널이 강한 상태에서 매수';
      if (rsi != null && rsi <= 30) return 'GOOD: 과매도 구간에서 매수';
      return 'NEUTRAL: 특별한 시그널 없는 상태에서 매수';
    }

    if (action === 'SELL') {
      if (rsi != null && rsi <= 30) return 'RISKY: 과매도 구간에서 매도 (공포 매도 가능성)';
      if (score != null && score > 30) return 'RISKY: 매수 시그널이 강한 상태에서 매도';
      if (rsi != null && rsi >= 70) return 'GOOD: 과매수 구간에서 매도';
      return 'NEUTRAL: 특별한 시그널 없는 상태에서 매도';
    }

    return 'UNKNOWN';
  }

  private generateHindsight(action: string, ta: any): string {
    const rsi = ta.rsi14;
    const macd = ta.macdHistogram;

    const hints: string[] = [];

    if (rsi != null) {
      if (action === 'BUY' && rsi >= 65) {
        hints.push(`당시 RSI가 ${rsi.toFixed(1)}로 과열 구간에 근접한 상태였습니다`);
      }
      if (action === 'SELL' && rsi <= 35) {
        hints.push(`당시 RSI가 ${rsi.toFixed(1)}로 반등 가능성이 있는 구간이었습니다`);
      }
    }

    if (macd != null) {
      if (action === 'BUY' && macd < 0) {
        hints.push('MACD 히스토그램이 음수로 하락 모멘텀이 있었습니다');
      }
      if (action === 'SELL' && macd > 0) {
        hints.push('MACD 히스토그램이 양수로 상승 모멘텀이 있었습니다');
      }
    }

    return hints.length > 0 ? hints.join('. ') : '해당 시점의 지표는 중립적이었습니다';
  }
}
