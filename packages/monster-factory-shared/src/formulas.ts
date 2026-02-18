import type { Element, MonsterStats, Personality } from './types/monster.js'
import type { StatType } from './types/item.js'
import {
  ELEMENT_ADVANTAGE,
  ELEMENT_ADVANTAGE_MULTIPLIER,
  ELEMENT_DISADVANTAGE_MULTIPLIER,
  GROWTH_THRESHOLDS,
  PERSONALITY_MODIFIERS,
} from './constants.js'

/**
 * 물리 데미지 계산
 * PhysDmg = (ATK × SkillPower) / (DEF_target × 0.3 + 1)
 */
export const calcPhysDamage = (
  atk: number,
  skillPower: number,
  defTarget: number,
): number => {
  return Math.floor((atk * skillPower) / (defTarget * 0.3 + 1))
}

/**
 * 마법 데미지 계산
 * MagDmg = (INT × SkillPower) / (INT_target × 0.3 + 1)
 */
export const calcMagDamage = (
  int: number,
  skillPower: number,
  intTarget: number,
): number => {
  return Math.floor((int * skillPower) / (intTarget * 0.3 + 1))
}

/**
 * 속성 상성 배율 계산
 * 유리: ×1.2 / 불리: ×0.8 / 중립: ×1.0
 */
export const calcElementMultiplier = (
  attacker: Element,
  defender: Element,
): number => {
  if (ELEMENT_ADVANTAGE[attacker] === defender) {
    return ELEMENT_ADVANTAGE_MULTIPLIER
  }
  if (ELEMENT_ADVANTAGE[defender] === attacker) {
    return ELEMENT_DISADVANTAGE_MULTIPLIER
  }
  return 1.0
}

/**
 * 총 스탯 합계로 성장 단계 결정
 */
export const calcGrowthStage = (
  totalStats: number,
): 'Egg' | 'Baby' | 'Boy' | 'Adult' | 'Awakened' => {
  if (totalStats >= GROWTH_THRESHOLDS.Awakened) return 'Awakened'
  if (totalStats >= GROWTH_THRESHOLDS.Adult) return 'Adult'
  if (totalStats >= GROWTH_THRESHOLDS.Boy) return 'Boy'
  if (totalStats >= GROWTH_THRESHOLDS.Baby) return 'Baby'
  return 'Egg'
}

/**
 * 몬스터 스탯 합계
 */
export const calcTotalStats = (stats: MonsterStats): number => {
  return stats.atk + stats.def + stats.hp + stats.agi + stats.int + stats.rec
}

/**
 * 성격 보정 적용
 */
export const applyPersonalityModifier = (
  stats: MonsterStats,
  personality: Personality,
): MonsterStats => {
  const modifiers = PERSONALITY_MODIFIERS[personality]
  const statKeys: StatType[] = ['atk', 'def', 'hp', 'agi', 'int', 'rec']

  return statKeys.reduce<MonsterStats>(
    (result, key) => {
      const modifier = modifiers[key] ?? 1.0
      return { ...result, [key]: Math.floor(stats[key] * modifier) }
    },
    { ...stats },
  )
}
