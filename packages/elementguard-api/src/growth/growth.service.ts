import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GrowthRow } from '../common/types';

@Injectable()
export class GrowthService {
  constructor(private readonly prisma: PrismaService) {}

  async getGrowthTree(userId: string): Promise<GrowthRow> {
    const growth = await this.prisma.growthTree.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
    return {
      user_id: growth.userId,
      attack_level: growth.attackLevel,
      defense_level: growth.defenseLevel,
      economy_level: growth.economyLevel,
      luck_level: growth.luckLevel,
      total_invested: growth.totalInvested,
    };
  }

  async updateGrowthTree(
    userId: string,
    data: Omit<GrowthRow, 'user_id'>,
  ): Promise<GrowthRow> {
    const growth = await this.prisma.growthTree.upsert({
      where: { userId },
      update: {
        attackLevel: data.attack_level,
        defenseLevel: data.defense_level,
        economyLevel: data.economy_level,
        luckLevel: data.luck_level,
        totalInvested: data.total_invested,
      },
      create: {
        userId,
        attackLevel: data.attack_level,
        defenseLevel: data.defense_level,
        economyLevel: data.economy_level,
        luckLevel: data.luck_level,
        totalInvested: data.total_invested,
      },
    });
    return {
      user_id: growth.userId,
      attack_level: growth.attackLevel,
      defense_level: growth.defenseLevel,
      economy_level: growth.economyLevel,
      luck_level: growth.luckLevel,
      total_invested: growth.totalInvested,
    };
  }
}
