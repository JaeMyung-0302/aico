import type { Element, FusionElement, PlacedUnit } from '@/types'
import { getFusionResult, getFusionUnit, BASE_FUSION_CHANCE, FUSION_ADVANTAGES } from '@/game/data/fusions'
import { getFusionElementMultiplier } from './ElementSystem'

// 융합 가능 여부 확인
export const canFuse = (unit1: PlacedUnit, unit2: PlacedUnit): boolean => {
  // ★4 이상만 융합 가능
  if (unit1.grade < 4 || unit2.grade < 4) return false
  // 같은 등급이어야 함
  if (unit1.grade !== unit2.grade) return false
  // 이미 융합 유닛이면 불가
  if (unit1.fusionElement || unit2.fusionElement) return false
  // 다른 속성이어야 함
  const elem1 = extractElement(unit1.unitDataId)
  const elem2 = extractElement(unit2.unitDataId)
  if (!elem1 || !elem2 || elem1 === elem2) return false
  // 융합 조합이 존재하는지 확인
  return !!getFusionResult(elem1, elem2)
}

// 융합 시도 결과
export interface FusionAttemptResult {
  success: boolean
  fusionElement?: FusionElement
  fusionUnitName?: string
}

// 융합 시도
export const attemptFusion = (
  elem1: Element,
  elem2: Element,
  chanceBonus: number = 0,
): FusionAttemptResult => {
  const fusionElement = getFusionResult(elem1, elem2)
  if (!fusionElement) return { success: false }

  const chance = Math.min(BASE_FUSION_CHANCE + chanceBonus, 1.0)
  const roll = Math.random()

  if (roll >= chance) return { success: false }

  const fusionUnit = getFusionUnit(fusionElement)
  return {
    success: true,
    fusionElement,
    fusionUnitName: fusionUnit?.name,
  }
}

// 융합 유닛의 이중 상성 데미지 계산
export const calculateFusionDamage = (
  baseDamage: number,
  fusionElement: FusionElement,
  defenderElement: Element,
): number => {
  const multiplier = getFusionElementMultiplier(fusionElement, defenderElement)
  return Math.round(baseDamage * multiplier)
}

// 융합 유닛이 유리한 속성 목록
export const getFusionAdvantages = (fusionElement: FusionElement): Element[] =>
  FUSION_ADVANTAGES[fusionElement] ?? []

// 유닛 ID에서 속성 추출
const extractElement = (unitDataId: string): Element | undefined => {
  const prefix = unitDataId.split('-')[0]
  const elements: Element[] = ['fire', 'water', 'wind', 'thunder', 'earth']
  return elements.find((e) => e === prefix)
}
