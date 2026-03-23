import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AnalysisService } from '../analysis/analysis.service';
import { LlmService } from '../llm/llm.service';

interface BriefingItem {
  symbol: string;
  score: number;
  interpretation: string;
  rsi14?: number;
  macdHistogram?: number;
}

interface BriefingResult {
  userId: number;
  date: string;
  items: BriefingItem[];
}

@Injectable()
export class BriefingService {
  private readonly logger = new Logger(BriefingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly analysisService: AnalysisService,
    private readonly llmService: LlmService,
  ) {}

  async generateBriefingForUser(userId: number): Promise<BriefingResult> {
    const portfolios = await this.prisma.portfolio.findMany({
      where: { userId },
      include: { items: true },
    });

    const symbols = portfolios.flatMap((p) => p.items.map((i) => i.symbol));
    const uniqueSymbols = [...new Set(symbols)];

    const results = await Promise.allSettled(
      uniqueSymbols.map(async (symbol) => {
        const analysis = await this.analysisService.analyzeSymbol(symbol);
        const currentPrice = analysis.prices[analysis.prices.length - 1]?.close ?? 0;

        const interpretation = await this.llmService.interpretTaResult(
          symbol,
          currentPrice,
          analysis.taResult,
          analysis.signalScore,
        );

        return {
          symbol,
          score: analysis.signalScore.score,
          interpretation,
          rsi14: analysis.taResult.rsi14,
          macdHistogram: analysis.taResult.macdHistogram,
        };
      }),
    );

    const items: BriefingItem[] = results
      .filter((r): r is PromiseFulfilledResult<BriefingItem> => r.status === 'fulfilled')
      .map((r) => r.value);

    const failures = results.filter((r) => r.status === 'rejected');
    if (failures.length > 0) {
      this.logger.warn(`${failures.length} symbols failed during briefing generation`);
    }

    const result: BriefingResult = {
      userId,
      date: new Date().toISOString().split('T')[0] ?? '',
      items,
    };

    await this.prisma.briefingLog.create({
      data: {
        userId,
        content: result as any,
        sentVia: 'web',
      },
    });

    return result;
  }

  async getBriefings(userId: number, limit = 10) {
    return this.prisma.briefingLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getBriefing(userId: number, id: number) {
    return this.prisma.briefingLog.findFirst({
      where: { id, userId },
    });
  }
}
