import { Test, TestingModule } from '@nestjs/testing'
import { NotFoundException, BadRequestException } from '@nestjs/common'
import { CharactersService } from './characters.service'
import { PrismaService } from '../prisma/prisma.service'

const mockPrisma = {
  character: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    upsert: jest.fn(),
  },
}

describe('CharactersService', () => {
  let service: CharactersService

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CharactersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile()

    service = module.get<CharactersService>(CharactersService)
  })

  describe('findAll', () => {
    it('should return all characters for user', async () => {
      const chars = [{ id: 'c1', classType: 'Warrior' }]
      mockPrisma.character.findMany.mockResolvedValue(chars)

      const result = await service.findAll('user-1')

      expect(result).toEqual(chars)
    })
  })

  describe('findByClassType', () => {
    it('should throw BadRequestException for invalid class type', async () => {
      await expect(
        service.findByClassType('user-1', 'Invalid'),
      ).rejects.toThrow(BadRequestException)
    })

    it('should throw NotFoundException when character not found', async () => {
      mockPrisma.character.findFirst.mockResolvedValue(null)

      await expect(
        service.findByClassType('user-1', 'Warrior'),
      ).rejects.toThrow(NotFoundException)
    })

    it('should return character when found', async () => {
      const char = { id: 'c1', classType: 'Warrior' }
      mockPrisma.character.findFirst.mockResolvedValue(char)

      const result = await service.findByClassType('user-1', 'Warrior')

      expect(result).toEqual(char)
    })

    it('should accept all valid class types', async () => {
      const validTypes = ['Warrior', 'Archer', 'Mage', 'Paladin']
      for (const type of validTypes) {
        mockPrisma.character.findFirst.mockResolvedValue({
          id: 'c1',
          classType: type,
        })
        const result = await service.findByClassType('user-1', type)
        expect(result.classType).toBe(type)
      }
    })
  })

  describe('upsert', () => {
    it('should throw BadRequestException for invalid class type', async () => {
      await expect(service.upsert('user-1', 'Invalid', {})).rejects.toThrow(
        BadRequestException,
      )
    })

    it('should upsert character with partial stats', async () => {
      mockPrisma.character.upsert.mockResolvedValue({
        id: 'c1',
        permanentHp: 5,
      })

      const result = await service.upsert('user-1', 'Warrior', {
        permanentHp: 5,
      })

      expect(result.permanentHp).toBe(5)
      expect(mockPrisma.character.upsert).toHaveBeenCalledWith({
        where: { userId_classType: { userId: 'user-1', classType: 'Warrior' } },
        update: { permanentHp: 5 },
        create: { userId: 'user-1', classType: 'Warrior', permanentHp: 5 },
      })
    })

    it('should handle empty dto (no stat updates)', async () => {
      mockPrisma.character.upsert.mockResolvedValue({ id: 'c1' })

      await service.upsert('user-1', 'Mage', {})

      expect(mockPrisma.character.upsert).toHaveBeenCalledWith({
        where: { userId_classType: { userId: 'user-1', classType: 'Mage' } },
        update: {},
        create: { userId: 'user-1', classType: 'Mage' },
      })
    })
  })
})
