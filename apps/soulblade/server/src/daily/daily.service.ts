import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const ATTENDANCE_BONUS: Record<number, number> = {
  1: 10,
  2: 15,
  3: 20,
  4: 25,
  5: 30,
  6: 40,
  7: 100,
};

// UTC 기준 날짜 계산
const getToday = (): Date => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
};

const getYesterday = (): Date => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1));
};

@Injectable()
export class DailyService {
  constructor(private readonly prisma: PrismaService) {}

  getStatus = async (userId: string) => {
    const today = getToday();
    const record = await this.prisma.dailyProgress.findUnique({
      where: { userId_date: { userId, date: today } },
      select: { consecutiveDays: true, attendanceClaimed: true },
    });

    return {
      consecutiveDays: record?.consecutiveDays ?? 0,
      attendanceClaimed: record?.attendanceClaimed ?? false,
    };
  };

  claimAttendance = async (userId: string) => {
    const today = getToday();

    // 오늘 출석 기록 조회
    const todayRecord = await this.prisma.dailyProgress.findUnique({
      where: { userId_date: { userId, date: today } },
    });

    if (todayRecord?.attendanceClaimed) {
      throw new BadRequestException('Already claimed today');
    }

    // 어제 출석 기록 조회 (연속 출석 계산)
    const yesterday = getYesterday();
    const yesterdayRecord = await this.prisma.dailyProgress.findUnique({
      where: { userId_date: { userId, date: yesterday } },
      select: { consecutiveDays: true },
    });

    const prevConsecutive = yesterdayRecord?.consecutiveDays ?? 0;
    const newConsecutive = prevConsecutive + 1;
    const bonusDay = Math.min(newConsecutive, 7);
    const goldReward = ATTENDANCE_BONUS[bonusDay] ?? 10;

    // 트랜잭션: 출석 기록 upsert + 골드 지급 (실패 시 자동 롤백)
    return this.prisma.$transaction(async (tx) => {
      await tx.dailyProgress.upsert({
        where: { userId_date: { userId, date: today } },
        update: {
          attendanceClaimed: true,
          consecutiveDays: newConsecutive,
        },
        create: {
          userId,
          date: today,
          attendanceClaimed: true,
          consecutiveDays: newConsecutive,
        },
      });

      const result: { sb_increment_meta_gold: number }[] =
        await tx.$queryRaw`SELECT sb_increment_meta_gold(${userId}::uuid, ${goldReward})`;
      const newGold = result[0]?.sb_increment_meta_gold ?? 0;

      return {
        consecutiveDays: newConsecutive,
        goldReward,
        newGold,
      };
    });
  };
}
