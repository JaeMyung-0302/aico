import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProfileRow } from '../common/types';

@Injectable()
export class ProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string): Promise<ProfileRow> {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
    });
    if (!profile) {
      throw new NotFoundException('프로필을 찾을 수 없습니다');
    }
    return {
      id: profile.userId,
      display_name: profile.displayName,
      gel: profile.gel,
      exp: profile.exp,
      level: profile.level,
      total_games: profile.totalGames,
      best_score: profile.bestScore,
      is_guest: profile.isGuest,
    };
  }

  async updateProfile(
    userId: string,
    data: { display_name?: string },
  ): Promise<ProfileRow> {
    const profile = await this.prisma.profile.update({
      where: { userId },
      data: {
        ...(data.display_name !== undefined && {
          displayName: data.display_name,
        }),
      },
    });
    return {
      id: profile.userId,
      display_name: profile.displayName,
      gel: profile.gel,
      exp: profile.exp,
      level: profile.level,
      total_games: profile.totalGames,
      best_score: profile.bestScore,
      is_guest: profile.isGuest,
    };
  }
}
