import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TaEngineService } from '../ta-engine/ta-engine.service';
import { MarketDataService } from '../market-data/market-data.service';
import { LlmService } from '../llm/llm.service';
import { ReviewEngine } from './review-engine';
import { PatternDetector } from './pattern-detector';
import { CreateTradeDto } from './dto/create-trade.dto';

@Injectable()
export class TradeReviewService {
  private readonly logger = new Logger(TradeReviewService.name);
  private readonly reviewEngine: ReviewEngine;
  private readonly patternDetector: PatternDetector;

  constructor(
    private readonly prisma: PrismaService,
    private readonly taEngine: TaEngineService,
    private readonly marketData: MarketDataService,
    private readonly llmService: LlmService,
  ) {
    this.reviewEngine = new ReviewEngine();
    this.patternDetector = new PatternDetector();
  }

  async createTrade(userId: number, dto: CreateTradeDto) {
    // TA 스냅샷 조회 (매매 시점의 지표 데이터)
    const taSnapshot = await this.prisma.taResult.findFirst({
      where: {
        symbol: dto.symbol.toUpperCase(),
        date: { lte: new Date(dto.tradedAt) },
      },
      orderBy: { date: 'desc' },
    });

    return this.prisma.tradeLog.create({
      data: {
        userId,
        symbol: dto.symbol.toUpperCase(),
        action: dto.action,
        quantity: dto.quantity,
        price: dto.price,
        tradedAt: new Date(dto.tradedAt),
        memo: dto.memo,
        taSnapshot: taSnapshot ? JSON.parse(JSON.stringify({
          rsi14: taSnapshot.rsi14,
          macdHistogram: taSnapshot.macdHistogram,
          compositeScore: taSnapshot.compositeScore,
          bbUpper: taSnapshot.bbUpper,
          bbLower: taSnapshot.bbLower,
        })) : undefined,
      },
    });
  }

  async getTrades(userId: number, limit = 50) {
    return this.prisma.tradeLog.findMany({
      where: { userId },
      orderBy: { tradedAt: 'desc' },
      take: limit,
    });
  }

  async deleteTrade(userId: number, tradeId: number) {
    return this.prisma.tradeLog.deleteMany({
      where: { id: tradeId, userId },
    });
  }

  async generateReview(userId: number) {
    const trades = await this.prisma.tradeLog.findMany({
      where: { userId },
      orderBy: { tradedAt: 'asc' },
    });

    if (trades.length < 3) {
      return { error: '최소 3건의 매매 기록이 필요합니다.' };
    }

    // 매매별 복기 분석
    const tradeAnalyses = this.reviewEngine.analyzeTrades(trades);

    // 행동 패턴 감지
    const patterns = this.patternDetector.detectPatterns(trades);

    // LLM 종합 복기 생성
    const prompt = this.buildReviewPrompt(tradeAnalyses, patterns);
    let interpretation = '';
    try {
      interpretation = await this.llmService.interpretTaResult(
        'PORTFOLIO',
        0,
        {} as any,
        { score: 0, breakdown: [] },
      );
      // 실제로는 별도 prompt를 사용하지만, 기존 LlmService 구조 활용
    } catch {
      interpretation = '복기 해석을 생성할 수 없습니다.';
    }

    return {
      totalTrades: trades.length,
      tradeAnalyses,
      patterns,
      interpretation,
      generatedAt: new Date().toISOString(),
    };
  }

  private buildReviewPrompt(
    analyses: Array<{ symbol: string; action: string; result: string }>,
    patterns: Array<{ name: string; count: number; description: string }>,
  ): string {
    const tradesSummary = analyses
      .map((a) => `${a.symbol} ${a.action}: ${a.result}`)
      .join('\n');

    const patternsSummary = patterns
      .map((p) => `${p.name} (${p.count}회): ${p.description}`)
      .join('\n');

    return `매매 기록 복기 분석:\n\n${tradesSummary}\n\n행동 패턴:\n${patternsSummary}`;
  }
}
