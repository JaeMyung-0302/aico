import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { PrismaService } from '../prisma/prisma.service';

const mockTx = {
  equipment: {
    updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    update: jest.fn().mockResolvedValue({ id: 'eq-1', equippedBy: 'char-1' }),
  },
};

const mockPrisma = {
  equipment: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  character: {
    findFirst: jest.fn(),
  },
  $transaction: jest.fn((cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx)),
};

describe('InventoryService', () => {
  let service: InventoryService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
  });

  describe('findAll', () => {
    it('should return all equipment for user', async () => {
      const items = [{ id: 'eq-1' }, { id: 'eq-2' }];
      mockPrisma.equipment.findMany.mockResolvedValue(items);

      const result = await service.findAll('user-1');

      expect(result).toEqual(items);
      expect(mockPrisma.equipment.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('equipItem', () => {
    it('should throw NotFoundException when item not found', async () => {
      mockPrisma.equipment.findFirst.mockResolvedValue(null);

      await expect(service.equipItem('user-1', 'eq-1', 'char-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when character not owned', async () => {
      mockPrisma.equipment.findFirst.mockResolvedValue({ id: 'eq-1', type: 'weapon' });
      mockPrisma.character.findFirst.mockResolvedValue(null);

      await expect(service.equipItem('user-1', 'eq-1', 'char-1')).rejects.toThrow(ForbiddenException);
    });

    it('should equip item using transaction', async () => {
      mockPrisma.equipment.findFirst.mockResolvedValue({ id: 'eq-1', type: 'weapon' });
      mockPrisma.character.findFirst.mockResolvedValue({ id: 'char-1' });

      await service.equipItem('user-1', 'eq-1', 'char-1');

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(mockTx.equipment.updateMany).toHaveBeenCalled();
      expect(mockTx.equipment.update).toHaveBeenCalled();
    });
  });

  describe('unequipItem', () => {
    it('should throw NotFoundException when item not found', async () => {
      mockPrisma.equipment.findFirst.mockResolvedValue(null);

      await expect(service.unequipItem('user-1', 'eq-1')).rejects.toThrow(NotFoundException);
    });

    it('should unequip item', async () => {
      mockPrisma.equipment.findFirst.mockResolvedValue({ id: 'eq-1' });
      mockPrisma.equipment.update.mockResolvedValue({ id: 'eq-1', equippedBy: null });

      const result = await service.unequipItem('user-1', 'eq-1');

      expect(result.equippedBy).toBeNull();
    });
  });

  describe('sellItem', () => {
    it('should throw NotFoundException when item not found', async () => {
      mockPrisma.equipment.findFirst.mockResolvedValue(null);

      await expect(service.sellItem('user-1', 'eq-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when item is equipped', async () => {
      mockPrisma.equipment.findFirst.mockResolvedValue({ id: 'eq-1', equippedBy: 'char-1' });

      await expect(service.sellItem('user-1', 'eq-1')).rejects.toThrow(BadRequestException);
    });

    it('should sell unequipped item', async () => {
      mockPrisma.equipment.findFirst.mockResolvedValue({ id: 'eq-1', equippedBy: null });
      mockPrisma.equipment.delete.mockResolvedValue({});

      const result = await service.sellItem('user-1', 'eq-1');

      expect(result).toEqual({ deleted: true });
    });
  });
});
