import type { CharacterStats } from './types/character.js'
import type { EquipmentGrade, EquipmentTag } from './types/equipment.js'
import type { StageId } from './types/stage.js'
import {
  BASE_EXP_PER_LEVEL,
  DEF_FORMULA_BASE,
  EXP_GROWTH_RATE,
  GRADE_DROP_RATES,
  LEVEL_FACTOR_COEFF,
  LEVEL_FACTOR_MAX,
  LEVEL_FACTOR_MIN,
  PERMANENT_STAT_BASE_COST,
  PERMANENT_STAT_COST_GROWTH,
  STAGE_META_GOLD_REWARD,
  TAG_SYNERGY_CONFIGS,
} from './constants.js'

/**
 * 데미지 계산
 * FinalDmg = max(1, floor((ATK + weaponPower) × skillMultiplier × (BASE/(BASE+DEF)) × levelFactor × critMultiplier))
 */
export const calcDamage = (
  atk: number,
  weaponPower: number,
  def: number,
  skillMultiplier: number,
  attackerLevel: number,
  defenderLevel: number,
  critMultiplier: number,
): number => {
  const baseDmg = (atk + weaponPower) * skillMultiplier
  const defReduction = DEF_FORMULA_BASE / (DEF_FORMULA_BASE + def)
  const levelFactor = Math.max(
    LEVEL_FACTOR_MIN,
    Math.min(
      LEVEL_FACTOR_MAX,
      1 + LEVEL_FACTOR_COEFF * (attackerLevel - defenderLevel),
    ),
  )
  return Math.max(
    1,
    Math.floor(baseDmg * defReduction * levelFactor * critMultiplier),
  )
}

/**
 * 레벨업 필요 경험치 계산
 * ExpForLevel = BASE × GROWTH^(level-1)
 */
export const calcExpForLevel = (level: number): number => {
  return Math.floor(BASE_EXP_PER_LEVEL * Math.pow(EXP_GROWTH_RATE, level - 1))
}

/**
 * 장비 드롭률 계산 (럭 보정 적용)
 * 럭이 높을수록 고등급 확률 소폭 증가
 */
export const calcDropRate = (grade: EquipmentGrade, luck: number): number => {
  const baseRate = GRADE_DROP_RATES[grade]
  const luckBonus = luck * 0.001 // 럭 1당 0.1% 보너스
  return Math.min(baseRate + luckBonus, 1.0)
}

/**
 * 태그 시너지 보너스 계산
 * 장착 장비의 태그를 분석하여 활성화된 시너지 반환
 */
export const calcSynergyBonus = (
  equippedTags: readonly EquipmentTag[],
): ReadonlyArray<{
  tag: EquipmentTag
  bonus: Partial<CharacterStats>
  setCount: number
}> => {
  const tagCounts = new Map<EquipmentTag, number>()

  for (const tag of equippedTags) {
    tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1)
  }

  const activeSynergies: Array<{
    tag: EquipmentTag
    bonus: Partial<CharacterStats>
    setCount: number
  }> = []

  for (const [tag, count] of tagCounts) {
    const config = TAG_SYNERGY_CONFIGS[tag]
    if (count >= 4) {
      activeSynergies.push({ tag, bonus: config.fourSetBonus, setCount: 4 })
    } else if (count >= 3) {
      activeSynergies.push({ tag, bonus: config.threeSetBonus, setCount: 3 })
    }
  }

  return activeSynergies
}

/**
 * 메타 골드 보상 계산
 * 기본 보상 × (생존 시간 비율) × (보스 처치 보너스)
 */
export const calcMetaGoldReward = (
  stageId: StageId,
  survivedSeconds: number,
  stageDuration: number,
  bossKilled: boolean,
): number => {
  const baseReward = STAGE_META_GOLD_REWARD[stageId]
  const survivalRatio = Math.min(survivedSeconds / stageDuration, 1.0)
  const bossBonus = bossKilled ? 2.0 : 1.0
  return Math.floor(baseReward * survivalRatio * bossBonus)
}

/**
 * 영구 스탯 업그레이드 비용 계산
 * Cost = BASE × GROWTH^currentLevel
 */
export const calcPermanentStatCost = (currentLevel: number): number => {
  return Math.floor(
    PERMANENT_STAT_BASE_COST *
      Math.pow(PERMANENT_STAT_COST_GROWTH, currentLevel),
  )
}
