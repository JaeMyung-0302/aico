import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface AccuracyResult {
  signalType: string;
  total: number;
  correct: number;
  accuracy: number;
}

@Injectable()
export class AccuracyService {
  private readonly logger = new Logger(AccuracyService.name);

  constructor(private readonly prisma: PrismaService) {}

  async calculateAccuracy(symbol: string, lookbackDays = 5): Promise<AccuracyResult[]> {
    const signals = await this.prisma.signalLog.findMany({
      where: {
        symbol: symbol.toUpperCase(),
        createdAt: { lte: new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000) },
      },
      orderBy: { createdAt: 'asc' },
    });

    const typeMap = new Map<string, { total: number; correct: number }>();

    for (const signal of signals) {
      const signalDate = signal.createdAt;
      const futureDate = new Date(signalDate.getTime() + lookbackDays * 24 * 60 * 60 * 1000);

      const priceAtSignal = await this.prisma.priceData.findFirst({
        where: { symbol: signal.symbol, date: { lte: signalDate } },
        orderBy: { date: 'desc' },
      });

      const priceAfter = await this.prisma.priceData.findFirst({
        where: { symbol: signal.symbol, date: { lte: futureDate } },
        orderBy: { date: 'desc' },
      });

      if (!priceAtSignal || !priceAfter) continue;

      const priceChange = priceAfter.close - priceAtSignal.close;
      const isCorrect =
        (signal.direction === 'BULLISH' && priceChange > 0) ||
        (signal.direction === 'BEARISH' && priceChange < 0);

      const entry = typeMap.get(signal.type) ?? { total: 0, correct: 0 };
      entry.total++;
      if (isCorrect) entry.correct++;
      typeMap.set(signal.type, entry);
    }

    return Array.from(typeMap.entries()).map(([signalType, data]) => ({
      signalType,
      total: data.total,
      correct: data.correct,
      accuracy: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
    }));
  }
}
