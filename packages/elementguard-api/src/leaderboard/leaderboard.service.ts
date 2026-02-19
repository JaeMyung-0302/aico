import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LeaderboardEntry } from '../common/types';

@Injectable()
export class LeaderboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getWeeklyLeaderboard(limit = 10): Promise<LeaderboardEntry[]> {
    const weekStart = this.getWeekStart();
    const entries = await this.prisma.leaderboard.findMany({
      where: { weekStart },
      orderBy: { score: 'desc' },
      take: limit,
      select: {
        userId: true,
        displayName: true,
        score: true,
        wave: true,
      },
    });
    return entries.map((entry) => ({
      user_id: entry.userId,
      display_name: entry.displayName,
      score: entry.score,
      wave: entry.wave,
    }));
  }

  async submitEntry(
    userId: string,
    data: { score: number; wave: number },
  ): Promise<LeaderboardEntry> {
    const weekStart = this.getWeekStart();

    // display_name을 profiles에서 동기화
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      select: { displayName: true },
    });
    const displayName = profile?.displayName ?? 'Unknown';

    const entry = await this.prisma.leaderboard.upsert({
      where: { userId_weekStart: { userId, weekStart } },
      update: {
        score: data.score,
        wave: data.wave,
        displayName,
      },
      create: {
        userId,
        displayName,
        score: data.score,
        wave: data.wave,
        weekStart,
      },
    });

    return {
      user_id: entry.userId,
      display_name: entry.displayName,
      score: entry.score,
      wave: entry.wave,
    };
  }

  private getWeekStart(): Date {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(new Date(now).setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  }
}
