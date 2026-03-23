import { Injectable, Logger } from '@nestjs/common';
import { MarketDataService } from '../market-data/market-data.service';
import { TaEngineService, TaResultData } from '../ta-engine/ta-engine.service';
import { calculateCompositeScore } from '../ta-engine/scoring/composite-score';
import { SignalScore } from '../ta-engine/interfaces/signal-score.interface';
import { PrismaService } from '../prisma/prisma.service';
import { PriceDataRow } from '../market-data/interfaces/market-data-provider.interface';

export interface AnalysisResult {
  symbol: string;
  prices: PriceDataRow[];
  taResult: TaResultData;
  signalScore: SignalScore;
}

@Injectable()
export class AnalysisService {
  private readonly logger = new Logger(AnalysisService.name);

  constructor(
    private readonly marketData: MarketDataService,
    private readonly taEngine: TaEngineService,
    private readonly prisma: PrismaService,
  ) {}

  async analyzeSymbol(symbol: string): Promise<AnalysisResult> {
    const allPrices = await this.marketData.fetchAndStore(symbol);

    const closePrices = allPrices.map((p) => p.close);
    const volumes = allPrices.map((p) => p.volume);

    const taResult = this.taEngine.calculateAll(closePrices, volumes);
    const currentPrice = closePrices[closePrices.length - 1] ?? 0;
    const signalScore = calculateCompositeScore(taResult, currentPrice);

    const latestDate = allPrices[allPrices.length - 1]?.date ?? new Date();

    try {
      await this.prisma.taResult.upsert({
        where: {
          symbol_date: { symbol, date: latestDate },
        },
        update: {
          ...this.toDbFields(taResult),
          compositeScore: signalScore.score,
        },
        create: {
          symbol,
          date: latestDate,
          ...this.toDbFields(taResult),
          compositeScore: signalScore.score,
        },
      });
    } catch (error) {
      this.logger.warn(`Failed to save TA result for ${symbol}: ${error}`);
    }

    const recentPrices = allPrices.slice(-60);

    return {
      symbol,
      prices: recentPrices,
      taResult,
      signalScore,
    };
  }

  private toDbFields(data: TaResultData) {
    return {
      sma20: data.sma20 ?? null,
      sma50: data.sma50 ?? null,
      sma200: data.sma200 ?? null,
      ema12: data.ema12 ?? null,
      ema26: data.ema26 ?? null,
      rsi14: data.rsi14 ?? null,
      macdLine: data.macdLine ?? null,
      macdSignal: data.macdSignal ?? null,
      macdHistogram: data.macdHistogram ?? null,
      bbUpper: data.bbUpper ?? null,
      bbMiddle: data.bbMiddle ?? null,
      bbLower: data.bbLower ?? null,
      volumeRatio: data.volumeRatio ?? null,
    };
  }
}
