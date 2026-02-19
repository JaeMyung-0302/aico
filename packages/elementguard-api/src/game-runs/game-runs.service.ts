import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GameRunInsert } from '../common/types';

@Injectable()
export class GameRunsService {
  constructor(private readonly prisma: PrismaService) {}

  async saveGameRun(userId: string, data: Omit<GameRunInsert, 'user_id'>) {
    return this.prisma.$transaction(async (tx) => {
      const gameRun = await tx.gameRun.create({
        data: {
          userId,
          wave: data.wave,
          score: data.score,
          isClear: data.is_clear,
          artifacts: data.artifacts,
          durationSeconds: data.duration_seconds,
        },
      });

      // 프로필 통계 원자적 갱신 (Supabase RPC 대체)
      await tx.profile.update({
        where: { userId },
        data: { totalGames: { increment: 1 } },
      });
      await tx.$executeRaw`
        UPDATE profiles
        SET best_score = GREATEST(best_score, ${data.score})
        WHERE user_id = ${userId}::uuid
      `;

      return {
        id: gameRun.id,
        user_id: gameRun.userId,
        wave: gameRun.wave,
        score: gameRun.score,
        is_clear: gameRun.isClear,
        artifacts: gameRun.artifacts,
        duration_seconds: gameRun.durationSeconds,
      };
    });
  }

  async getGameRuns(userId: string, limit = 10) {
    const runs = await this.prisma.gameRun.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return runs.map((run) => ({
      user_id: run.userId,
      wave: run.wave,
      score: run.score,
      is_clear: run.isClear,
      artifacts: run.artifacts,
      duration_seconds: run.durationSeconds,
    }));
  }
}
