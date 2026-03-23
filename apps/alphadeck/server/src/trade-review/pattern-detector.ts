import type { TaSnapshot } from './interfaces/ta-snapshot.interface';

interface TradeLog {
  id: number;
  symbol: string;
  action: string;
  quantity: number;
  price: number;
  tradedAt: Date;
  taSnapshot: TaSnapshot | null;
}

export interface DetectedPattern {
  name: string;
  count: number;
  total: number;
  ratio: number;
  description: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
}

export class PatternDetector {
  detectPatterns(trades: TradeLog[]): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];

    const buyTrades = trades.filter((t) => t.action === 'BUY');
    const sellTrades = trades.filter((t) => t.action === 'SELL');

    // 과매수 추격매수 패턴
    const overboughtBuys = buyTrades.filter(
      (t) => t.taSnapshot?.rsi14 != null && t.taSnapshot.rsi14 >= 70,
    );
    if (overboughtBuys.length >= 2) {
      patterns.push({
        name: '과매수 추격매수',
        count: overboughtBuys.length,
        total: buyTrades.length,
        ratio: buyTrades.length > 0 ? overboughtBuys.length / buyTrades.length : 0,
        description: `RSI 70 이상일 때 매수한 횟수가 ${overboughtBuys.length}회입니다. 과열 구간에서의 추격매수는 단기 조정 위험이 높습니다.`,
        severity: overboughtBuys.length >= 3 ? 'CRITICAL' : 'WARNING',
      });
    }

    // 공포 매도 패턴
    const panicSells = sellTrades.filter(
      (t) => t.taSnapshot?.rsi14 != null && t.taSnapshot.rsi14 <= 30,
    );
    if (panicSells.length >= 2) {
      patterns.push({
        name: '공포 매도',
        count: panicSells.length,
        total: sellTrades.length,
        ratio: sellTrades.length > 0 ? panicSells.length / sellTrades.length : 0,
        description: `RSI 30 이하일 때 매도한 횟수가 ${panicSells.length}회입니다. 과매도 구간에서의 매도는 바닥 근처에서 손실을 확정하는 경향이 있습니다.`,
        severity: panicSells.length >= 3 ? 'CRITICAL' : 'WARNING',
      });
    }

    // 역추세 매매 패턴 (compositeScore 반대 방향)
    const counterTrendBuys = buyTrades.filter(
      (t) => t.taSnapshot?.compositeScore != null && t.taSnapshot.compositeScore < -30,
    );
    if (counterTrendBuys.length >= 2) {
      patterns.push({
        name: '역추세 매수',
        count: counterTrendBuys.length,
        total: buyTrades.length,
        ratio: buyTrades.length > 0 ? counterTrendBuys.length / buyTrades.length : 0,
        description: `복합 스코어가 -30 이하(강한 매도 시그널)일 때 매수한 횟수가 ${counterTrendBuys.length}회입니다.`,
        severity: 'WARNING',
      });
    }

    // 빈번한 매매 패턴 (같은 종목 7일 내 매수→매도)
    const quickFlips = this.detectQuickFlips(trades);
    if (quickFlips >= 3) {
      patterns.push({
        name: '단타 성향',
        count: quickFlips,
        total: trades.length,
        ratio: trades.length > 0 ? quickFlips / trades.length : 0,
        description: `7일 내 같은 종목을 매수→매도한 횟수가 ${quickFlips}회입니다. 잦은 매매는 수수료 부담을 높입니다.`,
        severity: quickFlips >= 5 ? 'WARNING' : 'INFO',
      });
    }

    // 시그널 순응 패턴 (좋은 패턴)
    const signalAlignedBuys = buyTrades.filter(
      (t) => t.taSnapshot?.compositeScore != null && t.taSnapshot.compositeScore > 30,
    );
    if (signalAlignedBuys.length >= 2 && buyTrades.length > 0) {
      const ratio = signalAlignedBuys.length / buyTrades.length;
      if (ratio >= 0.5) {
        patterns.push({
          name: '시그널 순응 매매',
          count: signalAlignedBuys.length,
          total: buyTrades.length,
          ratio,
          description: `매수의 ${(ratio * 100).toFixed(0)}%가 매수 시그널과 일치합니다. 데이터 기반 의사결정을 잘 하고 있습니다.`,
          severity: 'INFO',
        });
      }
    }

    return patterns;
  }

  private detectQuickFlips(trades: TradeLog[]): number {
    let count = 0;
    const buyMap = new Map<string, Date>();

    for (const trade of trades) {
      if (trade.action === 'BUY') {
        buyMap.set(trade.symbol, trade.tradedAt);
      } else if (trade.action === 'SELL') {
        const buyDate = buyMap.get(trade.symbol);
        if (buyDate) {
          const diffMs = trade.tradedAt.getTime() - buyDate.getTime();
          const diffDays = diffMs / (1000 * 60 * 60 * 24);
          if (diffDays <= 7) {
            count++;
          }
          buyMap.delete(trade.symbol);
        }
      }
    }

    return count;
  }
}
