import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TaEngineService } from '../ta-engine/ta-engine.service';
import type { Strategy, BacktestResult, BacktestTrade } from './interfaces/strategy.interface';
import { RsiStrategy } from './strategies/rsi-strategy';
import { MacdStrategy } from './strategies/macd-strategy';
import { CompositeStrategy } from './strategies/composite-strategy';

const STRATEGIES: Record<string, Strategy> = {
  rsi: new RsiStrategy(),
  macd: new MacdStrategy(),
  composite: new CompositeStrategy(),
};

@Injectable()
export class BacktestService {
  private readonly logger = new Logger(BacktestService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly taEngine: TaEngineService,
  ) {}

  getAvailableStrategies() {
    return Object.entries(STRATEGIES).map(([id, s]) => ({
      id,
      name: s.name,
    }));
  }

  async runBacktest(
    symbol: string,
    strategyId: string,
    periodDays = 365,
  ): Promise<BacktestResult> {
    const strategy = STRATEGIES[strategyId];
    if (!strategy) {
      throw new Error(`Unknown strategy: ${strategyId}`);
    }

    const since = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

    const priceData = await this.prisma.priceData.findMany({
      where: { symbol: symbol.toUpperCase(), date: { gte: since } },
      orderBy: { date: 'asc' },
    });

    if (priceData.length < 30) {
      throw new Error(`Insufficient data: ${priceData.length} days (need 30+)`);
    }

    const closePrices = priceData.map((p) => p.close);
    const volumes = priceData.map((p) => Number(p.volume));

    // 각 시점에서의 TA 계산 (슬라이딩 윈도우)
    const trades: BacktestTrade[] = [];
    let isHolding = false;
    let buyPrice = 0;
    let wins = 0;
    let losses = 0;
    let portfolioValue = 10000; // $10,000 시작
    let peakValue = portfolioValue;
    let maxDrawdown = 0;
    const dailyReturns: number[] = [];

    for (let i = 200; i < closePrices.length; i++) {
      const windowPrices = closePrices.slice(0, i + 1);
      const windowVolumes = volumes.slice(0, i + 1);

      const ta = this.taEngine.calculateAll(windowPrices, windowVolumes);

      let prevTa;
      if (i > 200) {
        const prevPrices = closePrices.slice(0, i);
        const prevVolumes = volumes.slice(0, i);
        prevTa = this.taEngine.calculateAll(prevPrices, prevVolumes);
      }

      const currentPrice = closePrices[i]!;
      const date = priceData[i]!.date.toISOString().split('T')[0]!;

      const input = { price: currentPrice, ta, previousTa: prevTa };

      if (!isHolding && strategy.shouldBuy(input)) {
        isHolding = true;
        buyPrice = currentPrice;
        trades.push({
          date,
          action: 'BUY',
          price: currentPrice,
          reason: `${strategy.name} 매수 시그널`,
        });
      } else if (isHolding && strategy.shouldSell(input)) {
        isHolding = false;
        const returnPct = (currentPrice - buyPrice) / buyPrice;
        portfolioValue *= 1 + returnPct;

        if (returnPct > 0) wins++;
        else losses++;

        trades.push({
          date,
          action: 'SELL',
          price: currentPrice,
          reason: `${strategy.name} 매도 시그널 (${(returnPct * 100).toFixed(1)}%)`,
        });
      }

      // 드로다운 계산
      if (portfolioValue > peakValue) peakValue = portfolioValue;
      const drawdown = (peakValue - portfolioValue) / peakValue;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;

      // 일별 수익률
      if (i > 200) {
        const prevPrice = closePrices[i - 1]!;
        dailyReturns.push((currentPrice - prevPrice) / prevPrice);
      }
    }

    const firstPrice = closePrices[200]!;
    const lastPrice = closePrices[closePrices.length - 1]!;
    const buyAndHoldReturn = ((lastPrice - firstPrice) / firstPrice) * 100;
    const totalReturn = ((portfolioValue - 10000) / 10000) * 100;
    const totalTrades = wins + losses;
    const winRate = totalTrades > 0 ? wins / totalTrades : 0;

    // 샤프 비율 (연율화)
    const avgReturn = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
    const stdDev = Math.sqrt(
      dailyReturns.reduce((sum, r) => sum + (r - avgReturn) ** 2, 0) / dailyReturns.length,
    );
    const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;

    return {
      strategy: strategy.name,
      symbol: symbol.toUpperCase(),
      period: `${periodDays}d`,
      totalReturn: Math.round(totalReturn * 100) / 100,
      buyAndHoldReturn: Math.round(buyAndHoldReturn * 100) / 100,
      trades,
      tradeCount: trades.length,
      winRate: Math.round(winRate * 100) / 100,
      maxDrawdown: Math.round(maxDrawdown * 10000) / 100,
      sharpeRatio: Math.round(sharpeRatio * 100) / 100,
    };
  }
}
