import {
  Injectable,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CompleteRunDto } from './dto/complete-run.dto'

// 스테이지별 메타 골드 기본 보상
const STAGE_META_GOLD: Record<string, number> = {
  serpent_forest: 50,
  ice_cave: 80,
  flame_castle: 120,
}

// 스테이지별 지속 시간 (초)
const STAGE_DURATION: Record<string, number> = {
  serpent_forest: 900,
  ice_cave: 1200,
  flame_castle: 1500,
}

// 등급별 드롭 확률
const GRADE_DROP_RATES = [
  { grade: 'common', rate: 0.5 },
  { grade: 'uncommon', rate: 0.28 },
  { grade: 'rare', rate: 0.15 },
  { grade: 'epic', rate: 0.06 },
  { grade: 'legendary', rate: 0.01 },
]

const EQUIPMENT_TYPES = ['weapon', 'armor', 'accessory'] as const
const EQUIPMENT_TAGS = [
  'fire',
  'ice',
  'vampire',
  'thunder',
  'holy',
  'poison',
] as const

const GRADE_STAT_RANGES: Record<string, { min: number; max: number }> = {
  common: { min: 1, max: 5 },
  uncommon: { min: 4, max: 10 },
  rare: { min: 8, max: 18 },
  epic: { min: 15, max: 30 },
  legendary: { min: 25, max: 50 },
}

const STAT_KEYS = ['hp', 'atk', 'def', 'spd'] as const

const randomBetween = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min

const pickRandom = <T>(arr: readonly T[]): T =>
  arr[Math.floor(Math.random() * arr.length)]!

const rollGrade = (): string => {
  const roll = Math.random()
  let cumulative = 0
  for (const { grade, rate } of GRADE_DROP_RATES) {
    cumulative += rate
    if (roll <= cumulative) return grade
  }
  return 'common'
}

const GRADE_PREFIX: Record<string, string> = {
  common: '낡은',
  uncommon: '견고한',
  rare: '빛나는',
  epic: '고대의',
  legendary: '전설의',
}

const TYPE_NAMES: Record<string, string> = {
  weapon: '무기',
  armor: '갑옷',
  accessory: '장신구',
}

const generateEquipment = (userId: string) => {
  const grade = rollGrade()
  const type = pickRandom(EQUIPMENT_TYPES)
  const range = GRADE_STAT_RANGES[grade]!
  const tagCount = grade === 'legendary' ? 3 : grade === 'epic' ? 2 : 1
  const tags: string[] = []
  for (let i = 0; i < tagCount; i++) {
    const tag = pickRandom(EQUIPMENT_TAGS)
    if (!tags.includes(tag)) tags.push(tag)
  }

  const stats: Record<string, number> = {}
  const statCount = randomBetween(1, 3)
  for (let i = 0; i < statCount; i++) {
    const key = pickRandom(STAT_KEYS)
    stats[key] = (stats[key] ?? 0) + randomBetween(range.min, range.max)
  }

  return {
    userId,
    type,
    grade,
    name: `${GRADE_PREFIX[grade]} ${tags[0] ?? ''} ${TYPE_NAMES[type]}`.trim(),
    tags,
    stats,
  }
}

@Injectable()
export class RunsService {
  constructor(private readonly prisma: PrismaService) {}

  completeRun = async (userId: string, dto: CompleteRunDto) => {
    // 캐릭터 소유권 확인
    const character = await this.prisma.character.findFirst({
      where: { id: dto.characterId, userId },
      select: { id: true },
    })

    if (!character) {
      throw new ForbiddenException('Character not found or not owned')
    }

    // 스테이지 검증
    const duration = STAGE_DURATION[dto.stageId]
    if (!duration) {
      throw new BadRequestException('Invalid stage')
    }
    if (dto.survivedSeconds > duration + 5) {
      throw new BadRequestException('Invalid survived time')
    }

    // 메타 골드 계산
    const baseReward = STAGE_META_GOLD[dto.stageId] ?? 50
    const survivalRatio = Math.min(dto.survivedSeconds / duration, 1.0)
    const bossBonus = dto.bossKilled ? 2.0 : 1.0
    const metaGoldEarned = Math.floor(baseReward * survivalRatio * bossBonus)

    // 장비 드롭 생성
    const dropCount = randomBetween(1, dto.bossKilled ? 3 : 2)
    const equipmentData = Array.from({ length: dropCount }, () =>
      generateEquipment(userId),
    )

    // 트랜잭션: 장비 INSERT + 런 기록 INSERT + 골드 증가
    return this.prisma.$transaction(async (tx) => {
      const droppedEquipment = await tx.equipment.createManyAndReturn({
        data: equipmentData,
        select: { id: true },
      })

      const equipmentIds = droppedEquipment.map((e) => e.id)

      await tx.gameRun.create({
        data: {
          userId,
          characterId: dto.characterId,
          classType: dto.classType,
          stageId: dto.stageId,
          score: dto.score,
          survivedSeconds: dto.survivedSeconds,
          monstersKilled: dto.monstersKilled,
          bossKilled: dto.bossKilled,
          maxLevel: dto.maxLevel,
          metaGoldEarned,
          skillsAcquired: dto.skillsAcquired,
          equipmentDropped: equipmentIds,
        },
      })

      await tx.$queryRaw`SELECT sb_increment_meta_gold(${userId}::uuid, ${metaGoldEarned})`

      return {
        metaGoldEarned,
        droppedEquipment: equipmentData,
        equipmentIds,
      }
    })
  }
}
