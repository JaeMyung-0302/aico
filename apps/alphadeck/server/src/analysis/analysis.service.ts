import { Inject, Injectable, Logger } from '@nestjs/common';
import { MarketDataService } from '../market-data/market-data.service';
import { TaEngineService, TaResultData } from '../ta-engine/ta-engine.service';
import { calculateCompositeScoreV2 } from '../ta-engine/scoring/composite-score';
import { SignalScore } from '../ta-engine/interfaces/signal-score.interface';
import { PrismaService } from '../prisma/prisma.service';
import { PriceDataRow } from '../market-data/interfaces/market-data-provider.interface';
import { LlmService } from '../llm/llm.service';
import { AnthropicProvider } from '../llm/anthropic.provider';
import { NewsContext } from '../llm/perplexity.provider';
import { AccuracyService } from '../backtest/accuracy.service';

interface AccuracyResult {
  signalType: string;
  total: number;
  correct: number;
  accuracy: number;
}

export interface AnalysisResult {
  symbol: string;
  prices: PriceDataRow[];
  taResult: TaResultData;
  signalScore: SignalScore;
  interpretation?: string;
  newsContext?: NewsContext | null;
  accuracy?: AccuracyResult[];
}

@Injectable()
export class AnalysisService {
  private readonly logger = new Logger(AnalysisService.name);

  constructor(
    private readonly marketData: MarketDataService,
    private readonly taEngine: TaEngineService,
    private readonly prisma: PrismaService,
    private readonly llmService: LlmService,
    @Inject('ANTHROPIC_NEWS_PROVIDER')
    private readonly newsProvider: AnthropicProvider,
    private readonly accuracyService: AccuracyService,
  ) {}

  async analyzeSymbol(symbol: string, interval = '1d'): Promise<AnalysisResult> {
    const allPrices = await this.marketData.fetchAndStore(symbol, 200, interval);

    const closePrices = allPrices.map((p) => p.close);
    const volumes = allPrices.map((p) => p.volume);
    const highs = allPrices.map((p) => p.high);
    const lows = allPrices.map((p) => p.low);

    const taResult = this.taEngine.calculateAll(closePrices, volumes, highs, lows);
    const currentPrice = closePrices[closePrices.length - 1] ?? 0;
    const signalScore = calculateCompositeScoreV2(taResult, currentPrice);

    // LLM/뉴스/백테스트 병렬 호출 (best-effort)
    const [llmResult, newsResult, accuracyResult] = await Promise.allSettled([
      this.llmService.interpretWithCache(symbol, currentPrice, taResult, signalScore, interval),
      this.newsProvider.fetchNewsWithSentiment(symbol),
      this.accuracyService.calculateAccuracy(symbol),
    ]);

    const interpretation = llmResult.status === 'fulfilled'
      ? llmResult.value
      : `AI 해석을 일시적으로 제공할 수 없습니다. (스코어: ${signalScore.score})`;

    let newsContext: NewsContext | null = null;
    if (newsResult.status === 'fulfilled') {
      newsContext = newsResult.value;
      // regulatory guard 적용
      if (newsContext?.articles) {
        newsContext = {
          ...newsContext,
          articles: newsContext.articles.map((a) => ({
            ...a,
            title: this.llmService.filterForbiddenKeywords(a.title),
            summary: this.llmService.filterForbiddenKeywords(a.summary),
          })),
        };
      }
    } else {
      this.logger.warn(`News fetch failed for ${symbol}: ${newsResult.reason}`);
    }

    const accuracy = accuracyResult.status === 'fulfilled' ? accuracyResult.value : [];
    if (accuracyResult.status === 'rejected') {
      this.logger.warn(`Accuracy calc failed for ${symbol}: ${accuracyResult.reason}`);
    }

    // 일봉만 DB 저장
    if (interval === '1d') {
      const latestDate = allPrices[allPrices.length - 1]?.date ?? new Date();
      try {
        await this.prisma.taResult.upsert({
          where: { symbol_date: { symbol, date: latestDate } },
          update: { ...this.toDbFields(taResult), compositeScore: signalScore.score },
          create: { symbol, date: latestDate, ...this.toDbFields(taResult), compositeScore: signalScore.score },
        });
      } catch (error) {
        this.logger.warn(`Failed to save TA result for ${symbol}: ${error}`);
      }
    }

    const recentPrices = allPrices.slice(-60);

    return {
      symbol,
      prices: recentPrices,
      taResult,
      signalScore,
      interpretation,
      newsContext,
      accuracy,
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
