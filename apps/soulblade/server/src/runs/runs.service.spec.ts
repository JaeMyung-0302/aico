import { Test, TestingModule } from '@nestjs/testing'
import { ForbiddenException, BadRequestException } from '@nestjs/common'
import { RunsService } from './runs.service'
import { PrismaService } from '../prisma/prisma.service'

const mockTx = {
  equipment: {
    createManyAndReturn: jest
      .fn()
      .mockResolvedValue([{ id: 'eq-1' }, { id: 'eq-2' }]),
  },
  gameRun: {
    create: jest.fn().mockResolvedValue({ id: 'run-1' }),
  },
  $queryRaw: jest.fn().mockResolvedValue([{ sb_increment_meta_gold: 100 }]),
}

const mockPrisma = {
  character: {
    findFirst: jest.fn(),
  },
  $transaction: jest.fn((cb: (tx: typeof mockTx) => Promise<unknown>) =>
    cb(mockTx),
  ),
}

describe('RunsService', () => {
  let service: RunsService

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RunsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile()

    service = module.get<RunsService>(RunsService)
  })

  const validDto = {
    characterId: 'char-1',
    classType: 'Warrior' as const,
    stageId: 'serpent_forest' as const,
    score: 1000,
    survivedSeconds: 300,
    monstersKilled: 50,
    bossKilled: false,
    maxLevel: 10,
    skillsAcquired: [],
  }

  it('should throw ForbiddenException when character not owned', async () => {
    mockPrisma.character.findFirst.mockResolvedValue(null)

    await expect(service.completeRun('user-1', validDto)).rejects.toThrow(
      ForbiddenException,
    )
  })

  it('should throw BadRequestException for invalid stage', async () => {
    mockPrisma.character.findFirst.mockResolvedValue({ id: 'char-1' })

    await expect(
      service.completeRun('user-1', {
        ...validDto,
        stageId: 'invalid_stage' as never,
      }),
    ).rejects.toThrow(BadRequestException)
  })

  it('should throw BadRequestException for invalid survived time', async () => {
    mockPrisma.character.findFirst.mockResolvedValue({ id: 'char-1' })

    // serpent_forest duration = 900, exceeded by more than 5 seconds
    await expect(
      service.completeRun('user-1', { ...validDto, survivedSeconds: 910 }),
    ).rejects.toThrow(BadRequestException)
  })

  it('should complete run with correct meta gold (no boss)', async () => {
    mockPrisma.character.findFirst.mockResolvedValue({ id: 'char-1' })

    const result = await service.completeRun('user-1', validDto)

    // baseReward = 50, survivalRatio = 300/900 = 0.333, bossBonus = 1.0
    // metaGoldEarned = floor(50 * 0.333 * 1.0) = 16
    expect(result.metaGoldEarned).toBe(16)
    expect(result.equipmentIds).toEqual(['eq-1', 'eq-2'])
    expect(mockTx.gameRun.create).toHaveBeenCalledTimes(1)
    expect(mockTx.$queryRaw).toHaveBeenCalledTimes(1)
  })

  it('should apply boss bonus (x2) when bossKilled is true', async () => {
    mockPrisma.character.findFirst.mockResolvedValue({ id: 'char-1' })

    const result = await service.completeRun('user-1', {
      ...validDto,
      bossKilled: true,
      survivedSeconds: 900,
    })

    // baseReward = 50, survivalRatio = 1.0, bossBonus = 2.0
    // metaGoldEarned = floor(50 * 1.0 * 2.0) = 100
    expect(result.metaGoldEarned).toBe(100)
  })

  it('should cap survival ratio at 1.0', async () => {
    mockPrisma.character.findFirst.mockResolvedValue({ id: 'char-1' })

    const result = await service.completeRun('user-1', {
      ...validDto,
      survivedSeconds: 905, // within +5 tolerance
    })

    // survivalRatio capped at 1.0
    // metaGoldEarned = floor(50 * 1.0 * 1.0) = 50
    expect(result.metaGoldEarned).toBe(50)
  })

  it('should use $transaction for atomicity', async () => {
    mockPrisma.character.findFirst.mockResolvedValue({ id: 'char-1' })

    await service.completeRun('user-1', validDto)

    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1)
  })

  it('should generate equipment and return dropped items', async () => {
    mockPrisma.character.findFirst.mockResolvedValue({ id: 'char-1' })

    const result = await service.completeRun('user-1', validDto)

    expect(result.droppedEquipment).toBeDefined()
    expect(Array.isArray(result.droppedEquipment)).toBe(true)
    expect(result.droppedEquipment.length).toBeGreaterThan(0)

    // 장비에 필수 필드가 있는지 확인
    for (const eq of result.droppedEquipment) {
      expect(eq).toHaveProperty('userId', 'user-1')
      expect(eq).toHaveProperty('type')
      expect(eq).toHaveProperty('grade')
      expect(eq).toHaveProperty('name')
      expect(eq).toHaveProperty('tags')
      expect(eq).toHaveProperty('stats')
    }
  })
})
