import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma';
import { ProfilesService } from './profiles.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  profile: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

describe('ProfilesService', () => {
  let service: ProfilesService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfilesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ProfilesService>(ProfilesService);
  });

  describe('getMyProfile', () => {
    it('should return profile when found', async () => {
      const profile = { id: 'u1', displayName: 'Test', metaGold: 100, gems: 5, attendanceStreak: 3, lastAttendanceDate: null };
      mockPrisma.profile.findUnique.mockResolvedValue(profile);

      const result = await service.getMyProfile('u1');

      expect(result).toEqual(profile);
    });

    it('should throw NotFoundException when profile not found', async () => {
      mockPrisma.profile.findUnique.mockResolvedValue(null);

      await expect(service.getMyProfile('u1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateDisplayName', () => {
    it('should update display name successfully', async () => {
      mockPrisma.profile.update.mockResolvedValue({ id: 'u1', displayName: 'NewName' });

      const result = await service.updateDisplayName('u1', 'NewName');

      expect(result.displayName).toBe('NewName');
    });

    it('should throw NotFoundException on P2025 error', async () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError('Record not found', {
        code: 'P2025',
        clientVersion: '6.0.0',
      });
      mockPrisma.profile.update.mockRejectedValue(prismaError);

      await expect(service.updateDisplayName('u1', 'Name')).rejects.toThrow(NotFoundException);
    });

    it('should rethrow non-P2025 errors', async () => {
      mockPrisma.profile.update.mockRejectedValue(new Error('Connection failed'));

      await expect(service.updateDisplayName('u1', 'Name')).rejects.toThrow('Connection failed');
    });
  });
});
