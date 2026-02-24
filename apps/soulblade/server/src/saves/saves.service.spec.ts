import { Test, TestingModule } from '@nestjs/testing';
import { SavesService } from './saves.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  rpgSave: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
};

describe('SavesService', () => {
  let service: SavesService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SavesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<SavesService>(SavesService);
  });

  describe('loadSave', () => {
    it('should return save data when found', async () => {
      const save = { saveData: { version: 1 }, updatedAt: new Date() };
      mockPrisma.rpgSave.findUnique.mockResolvedValue(save);

      const result = await service.loadSave('user-1');

      expect(result).toEqual(save);
    });

    it('should return default when no save exists', async () => {
      mockPrisma.rpgSave.findUnique.mockResolvedValue(null);

      const result = await service.loadSave('user-1');

      expect(result).toEqual({ saveData: {}, updatedAt: null });
    });
  });

  describe('upsertSave', () => {
    it('should upsert save data', async () => {
      const upsertResult = { id: 'save-1', updatedAt: new Date() };
      mockPrisma.rpgSave.upsert.mockResolvedValue(upsertResult);

      const result = await service.upsertSave('user-1', { version: 1, gold: 100 });

      expect(result).toEqual(upsertResult);
      expect(mockPrisma.rpgSave.upsert).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        update: { saveData: { version: 1, gold: 100 } },
        create: { userId: 'user-1', saveData: { version: 1, gold: 100 } },
        select: { id: true, updatedAt: true },
      });
    });
  });
});
