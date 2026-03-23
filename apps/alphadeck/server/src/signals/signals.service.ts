import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AnalysisService } from '../analysis/analysis.service';
import { detectSignals, deduplicateSignals, type DetectedSignal, type SignalType } from './signal-detector';

@Injectable()
export class SignalsService {
  private readonly logger = new Logger(SignalsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly analysisService: AnalysisService,
  ) {}

  async checkSignalsForUser(userId: number): Promise<DetectedSignal[]> {
    const portfolios = await this.prisma.portfolio.findMany({
      where: { userId },
      include: { items: true },
    });

    const symbols = [...new Set(portfolios.flatMap((p) => p.items.map((i) => i.symbol)))];
    const allSignals: Array<DetectedSignal & { symbol: string }> = [];

    for (const symbol of symbols) {
      try {
        const analysis = await this.analysisService.analyzeSymbol(symbol);
        const currentPrice = analysis.prices[analysis.prices.length - 1]?.close ?? 0;

        const signals = detectSignals({
          symbol,
          current: analysis.taResult,
          currentPrice,
        });

        for (const signal of signals) {
          allSignals.push({ ...signal, symbol });
        }
      } catch (error) {
        this.logger.warn(`Signal check failed for ${symbol}: ${error}`);
      }
    }

    // 중복 제거
    const recentSignals = await this.prisma.signalLog.findMany({
      where: {
        userId,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      select: { symbol: true, type: true, createdAt: true },
    });

    const deduped = deduplicateSignals(
      allSignals.map((s) => ({ symbol: s.symbol, type: s.type })),
      recentSignals,
    );

    const dedupedSet = new Set(deduped.map((d) => `${d.symbol}:${d.type}`));
    return allSignals.filter((s) => dedupedSet.has(`${s.symbol}:${s.type}`));
  }

  async saveSignals(
    userId: number,
    signals: Array<DetectedSignal & { symbol: string }>,
  ) {
    for (const signal of signals) {
      await this.prisma.signalLog.create({
        data: {
          userId,
          symbol: signal.symbol,
          type: signal.type,
          direction: signal.direction,
          value: signal.value,
          threshold: signal.threshold,
          message: signal.message,
        },
      });
    }
  }

  async getSignalHistory(userId: number, limit = 30) {
    return this.prisma.signalLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async markAsRead(userId: number, signalId: number) {
    return this.prisma.signalLog.updateMany({
      where: { id: signalId, userId },
      data: { readAt: new Date() },
    });
  }

  async getPreferences(userId: number) {
    return this.prisma.alertPreference.findMany({
      where: { userId },
    });
  }

  async upsertPreference(
    userId: number,
    symbol: string,
    data: { enabled: boolean; emailEnabled: boolean; pushEnabled: boolean },
  ) {
    return this.prisma.alertPreference.upsert({
      where: { userId_symbol: { userId, symbol } },
      create: {
        userId,
        symbol,
        ...data,
      },
      update: data,
    });
  }
}
