import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { DailyService } from './daily.service';
import { PrismaService } from '../prisma/prisma.service';

const mockTx = {
  dailyProgress: {
    upsert: jest.fn().mockResolvedValue({}),
  },
  $queryRaw: jest.fn().mockResolvedValue([{ sb_increment_meta_gold: 110 }]),
};

const mockPrisma = {
  dailyProgress: {
    findUnique: jest.fn(),
  },
  $transaction: jest.fn((cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx)),
};

describe('DailyService', () => {
  let service: DailyService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DailyService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<DailyService>(DailyService);
  });

  describe('getStatus', () => {
    it('should return default values when no record exists', async () => {
      mockPrisma.dailyProgress.findUnique.mockResolvedValue(null);

      const result = await service.getStatus('user-1');

      expect(result).toEqual({
        consecutiveDays: 0,
        attendanceClaimed: false,
      });
    });

    it('should return existing record values', async () => {
      mockPrisma.dailyProgress.findUnique.mockResolvedValue({
        consecutiveDays: 3,
        attendanceClaimed: true,
      });

      const result = await service.getStatus('user-1');

      expect(result).toEqual({
        consecutiveDays: 3,
        attendanceClaimed: true,
      });
    });
  });

  describe('claimAttendance', () => {
    it('should throw BadRequestException if already claimed today', async () => {
      // 첫 번째 호출: 오늘 레코드 조회 (이미 수령)
      mockPrisma.dailyProgress.findUnique.mockResolvedValueOnce({
        attendanceClaimed: true,
        consecutiveDays: 3,
      });

      await expect(service.claimAttendance('user-1')).rejects.toThrow('Already claimed today');
    });

    it('should claim attendance with consecutive day 1 (no yesterday record)', async () => {
      // 오늘 레코드 없음
      mockPrisma.dailyProgress.findUnique.mockResolvedValueOnce(null);
      // 어제 레코드 없음
      mockPrisma.dailyProgress.findUnique.mockResolvedValueOnce(null);

      const result = await service.claimAttendance('user-1');

      expect(result.consecutiveDays).toBe(1);
      expect(result.goldReward).toBe(10); // day 1 bonus
      expect(result.newGold).toBe(110);
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('should continue consecutive streak from yesterday', async () => {
      // 오늘 레코드 없음
      mockPrisma.dailyProgress.findUnique.mockResolvedValueOnce(null);
      // 어제 레코드: 3일 연속
      mockPrisma.dailyProgress.findUnique.mockResolvedValueOnce({
        consecutiveDays: 3,
      });

      const result = await service.claimAttendance('user-1');

      expect(result.consecutiveDays).toBe(4);
      expect(result.goldReward).toBe(25); // day 4 bonus
    });

    it('should cap bonus at day 7', async () => {
      // 오늘 레코드 없음
      mockPrisma.dailyProgress.findUnique.mockResolvedValueOnce(null);
      // 어제 레코드: 10일 연속 (7일 이상)
      mockPrisma.dailyProgress.findUnique.mockResolvedValueOnce({
        consecutiveDays: 10,
      });

      const result = await service.claimAttendance('user-1');

      expect(result.consecutiveDays).toBe(11);
      expect(result.goldReward).toBe(100); // day 7 bonus (capped)
    });

    it('should use transaction for upsert and gold increment', async () => {
      mockPrisma.dailyProgress.findUnique.mockResolvedValueOnce(null);
      mockPrisma.dailyProgress.findUnique.mockResolvedValueOnce(null);

      await service.claimAttendance('user-1');

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(mockTx.dailyProgress.upsert).toHaveBeenCalledTimes(1);
      expect(mockTx.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it('should handle unclaimed today record as first claim', async () => {
      // 오늘 레코드 있지만 미수령
      mockPrisma.dailyProgress.findUnique.mockResolvedValueOnce({
        attendanceClaimed: false,
        consecutiveDays: 0,
      });
      // 어제 레코드: 2일 연속
      mockPrisma.dailyProgress.findUnique.mockResolvedValueOnce({
        consecutiveDays: 2,
      });

      const result = await service.claimAttendance('user-1');

      expect(result.consecutiveDays).toBe(3);
      expect(result.goldReward).toBe(20); // day 3 bonus
    });
  });
});
