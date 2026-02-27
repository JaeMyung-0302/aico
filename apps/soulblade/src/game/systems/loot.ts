import type {
  EquipmentGrade,
  EquipmentTag,
  EquipmentType,
} from '@soulblade/shared'
import { GRADE_DROP_RATES, GRADE_STAT_RANGES } from '@soulblade/shared'
import type { CharacterStats } from '@soulblade/shared'
import { eventBus } from '@/lib/event-bus'

// 장비 드롭 결과 (인런 표시용)
export interface LootDrop {
  readonly type: EquipmentType
  readonly grade: EquipmentGrade
  readonly name: string
  readonly tags: readonly EquipmentTag[]
  readonly stats: Partial<CharacterStats>
}

// 드롭 확률 기본값 (보스 처치 시 3배)
const BASE_DROP_CHANCE = 0.08
const BOSS_DROP_MULTIPLIER = 3.0
const ELITE_DROP_MULTIPLIER = 2.0

const EQUIPMENT_TYPES: readonly EquipmentType[] = [
  'weapon',
  'armor',
  'accessory',
]
const EQUIPMENT_TAGS: readonly EquipmentTag[] = [
  'fire',
  'ice',
  'vampire',
  'thunder',
  'holy',
  'poison',
]
const STAT_KEYS: readonly (keyof CharacterStats)[] = ['hp', 'atk', 'def', 'spd']

const pickRandom = <T>(arr: readonly T[]): T =>
  arr[Math.floor(Math.random() * arr.length)] as T

const randomBetween = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min

// 등급 결정 (가중치 기반)
const rollGrade = (luckBonus: number): EquipmentGrade => {
  const roll = Math.random() - luckBonus * 0.001
  const grades: readonly EquipmentGrade[] = [
    'legendary',
    'epic',
    'rare',
    'uncommon',
    'common',
  ]
  const thresholds = [
    1 - GRADE_DROP_RATES.legendary,
    1 - GRADE_DROP_RATES.legendary - GRADE_DROP_RATES.epic,
    1 -
      GRADE_DROP_RATES.legendary -
      GRADE_DROP_RATES.epic -
      GRADE_DROP_RATES.rare,
    1 -
      GRADE_DROP_RATES.legendary -
      GRADE_DROP_RATES.epic -
      GRADE_DROP_RATES.rare -
      GRADE_DROP_RATES.uncommon,
  ]

  for (let i = 0; i < thresholds.length; i++) {
    const threshold = thresholds[i]
    if (threshold !== undefined && roll >= threshold)
      return grades[i] as EquipmentGrade
  }
  return 'common'
}

// 장비 생성
const generateLoot = (luckBonus: number): LootDrop => {
  const grade = rollGrade(luckBonus)
  const type = pickRandom(EQUIPMENT_TYPES)
  const range = GRADE_STAT_RANGES[grade]

  // 태그 수: 등급에 따라 1-3개
  const tagCount = grade === 'legendary' ? 3 : grade === 'epic' ? 2 : 1
  const tags: EquipmentTag[] = []
  for (let i = 0; i < tagCount; i++) {
    const tag = pickRandom(EQUIPMENT_TAGS)
    if (!tags.includes(tag)) tags.push(tag)
  }

  // 스탯 랜덤 생성
  const stats: Partial<CharacterStats> = {}
  const statCount = randomBetween(1, 3)
  for (let i = 0; i < statCount; i++) {
    const key = pickRandom(STAT_KEYS)
    const current = (stats[key] as number | undefined) ?? 0
    ;(stats as Record<string, number>)[key] =
      current + randomBetween(range.min, range.max)
  }

  const gradePrefix: Record<EquipmentGrade, string> = {
    common: '낡은',
    uncommon: '견고한',
    rare: '빛나는',
    epic: '고대의',
    legendary: '전설의',
  }
  const typeNames: Record<EquipmentType, string> = {
    weapon: '무기',
    armor: '갑옷',
    accessory: '장신구',
  }

  return {
    type,
    grade,
    name: `${gradePrefix[grade]} ${tags[0] ?? ''} ${typeNames[type]}`.trim(),
    tags,
    stats,
  }
}

/**
 * 몬스터 처치 시 드롭 판정
 * @returns 드롭 아이템 or null
 */
export const processLootDrop = (
  killType: 'normal' | 'elite' | 'boss',
  goldBoostLevel: number,
): LootDrop | null => {
  const multiplier =
    killType === 'boss'
      ? BOSS_DROP_MULTIPLIER
      : killType === 'elite'
        ? ELITE_DROP_MULTIPLIER
        : 1.0

  const dropChance = BASE_DROP_CHANCE * multiplier
  if (Math.random() > dropChance) return null

  const loot = generateLoot(goldBoostLevel)

  // HUD에 드롭 알림
  eventBus.emit('event:trigger', {
    type: 'merchant',
    data: { lootDrop: loot },
  })

  return loot
}

// 런 종료 시 수집된 드롭 목록
export interface LootState {
  drops: LootDrop[]
}

export const createLootState = (): LootState => ({
  drops: [],
})
