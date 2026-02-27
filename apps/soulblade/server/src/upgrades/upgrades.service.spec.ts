import { Test, TestingModule } from '@nestjs/testing'
import { BadRequestException } from '@nestjs/common'
import { UpgradesService } from './upgrades.service'
import { PrismaService } from '../prisma/prisma.service'

const mockTx = {
  $queryRaw: jest.fn().mockResolvedValue([{}]),
  $executeRawUnsafe: jest.fn().mockResolvedValue(1),
}

const mockPrisma = {
  character: {
    findMany: jest.fn(),
  },
  profile: {
    findUnique: jest.fn(),
  },
  $transaction: jest.fn((cb: (tx: typeof mockTx) => Promise<unknown>) =>
    cb(mockTx),
  ),
}

describe('UpgradesService', () => {
  let service: UpgradesService

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpgradesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile()

    service = module.get<UpgradesService>(UpgradesService)
  })

  const defaultCharacter = {
    id: 'char-1',
    permanentHp: 0,
    permanentAtk: 0,
    permanentDef: 0,
    permanentSpd: 0,
    permanentCrit: 0,
  }

  it('should throw BadRequestException for invalid stat type', async () => {
    await expect(
      service.purchaseUpgrade('user-1', { statType: 'invalid' as never }),
    ).rejects.toThrow(BadRequestException)
  })

  it('should throw BadRequestException when no characters found', async () => {
    mockPrisma.character.findMany.mockResolvedValue([])

    await expect(
      service.purchaseUpgrade('user-1', { statType: 'hp' }),
    ).rejects.toThrow('No characters found')
  })

  it('should throw BadRequestException when max level reached', async () => {
    mockPrisma.character.findMany.mockResolvedValue([
      { ...defaultCharacter, permanentHp: 20 },
    ])

    await expect(
      service.purchaseUpgrade('user-1', { statType: 'hp' }),
    ).rejects.toThrow('Max level reached')
  })

  it('should purchase upgrade successfully at level 0', async () => {
    mockPrisma.character.findMany.mockResolvedValue([defaultCharacter])
    mockPrisma.profile.findUnique.mockResolvedValue({ metaGold: 950 })

    const result = await service.purchaseUpgrade('user-1', { statType: 'hp' })

    expect(result.statType).toBe('hp')
    expect(result.newLevel).toBe(1)
    expect(result.cost).toBe(50) // base cost at level 0
    expect(result.remainingGold).toBe(950)
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1)
  })

  it('should calculate cost with growth factor', async () => {
    mockPrisma.character.findMany.mockResolvedValue([
      { ...defaultCharacter, permanentAtk: 5 },
    ])
    mockPrisma.profile.findUnique.mockResolvedValue({ metaGold: 500 })

    const result = await service.purchaseUpgrade('user-1', { statType: 'atk' })

    // cost = floor(50 * 1.3^5) = floor(50 * 3.71293) = 185
    expect(result.cost).toBe(185)
    expect(result.newLevel).toBe(6)
  })

  it('should throw when gold deduction fails (insufficient gold)', async () => {
    mockPrisma.character.findMany.mockResolvedValue([defaultCharacter])
    mockTx.$queryRaw.mockRejectedValueOnce(new Error('Insufficient gold'))

    await expect(
      service.purchaseUpgrade('user-1', { statType: 'hp' }),
    ).rejects.toThrow(BadRequestException)
  })

  it('should update all characters with $executeRawUnsafe', async () => {
    mockPrisma.character.findMany.mockResolvedValue([
      { ...defaultCharacter, id: 'c1' },
      { ...defaultCharacter, id: 'c2' },
    ])
    mockPrisma.profile.findUnique.mockResolvedValue({ metaGold: 1000 })

    await service.purchaseUpgrade('user-1', { statType: 'def' })

    expect(mockTx.$executeRawUnsafe).toHaveBeenCalledWith(
      'UPDATE sb_characters SET permanent_def = $1 WHERE id = ANY($2::uuid[])',
      1,
      ['c1', 'c2'],
    )
  })

  it('should handle all valid stat types', async () => {
    const validStats = ['hp', 'atk', 'def', 'spd', 'crit']

    for (const stat of validStats) {
      mockPrisma.character.findMany.mockResolvedValue([defaultCharacter])
      mockPrisma.profile.findUnique.mockResolvedValue({ metaGold: 1000 })

      const result = await service.purchaseUpgrade('user-1', { statType: stat })
      expect(result.statType).toBe(stat)
    }
  })
})
